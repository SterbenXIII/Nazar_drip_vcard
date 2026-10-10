import { execFileSync } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import { expect, test } from './fixtures'

const appDir = resolve(import.meta.dirname, '..')
const repoDir = resolve(appDir, '../..')
const packageName = '@vcard/clinic-web'
const production = {
  CLINIC_ALLOW_PRODUCTION_BUILD: 'true',
  CLINIC_CANONICAL_ORIGIN: 'https://havenhub.example',
}
const supportingPages = ['programa', 'umovy', 'rodyni', 'napriamy'].map(
  (slug) => `${slug}/index.html`,
)

function run(label: string, args: string[], variables: Record<string, string> = {}) {
  const env = Object.fromEntries(
    ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TERM', 'XDG_CACHE_HOME', 'PLAYWRIGHT_BROWSERS_PATH']
      .filter((name) => process.env[name] !== undefined)
      .map((name) => [name, process.env[name]!]),
  )

  try {
    return execFileSync('pnpm', args, {
      cwd: repoDir,
      encoding: 'utf8',
      env: { ...env, ...variables },
      stdio: 'pipe',
    })
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; message: string }
    const output = [failure.stdout, failure.stderr].filter(Boolean).join('\n')
    throw new Error(`${label}: ${output || failure.message}`)
  }
}

async function htmlFiles() {
  const entries = await readdir(resolve(appDir, 'dist'), { recursive: true })
  return entries.filter((entry) => entry.endsWith('.html')).sort()
}

async function artifactExists(name: string) {
  const entries = await readdir(resolve(appDir, 'dist'), { recursive: true })
  return entries.includes(name)
}

test('publication modes preserve explicit release gates and correct SEO inventories', async () => {
  test.setTimeout(120_000)
  try {
    run('default build', ['--filter', packageName, 'build'])
    expect(await htmlFiles()).toEqual(['404.html', 'index.html'])
    run('default metadata', ['--filter', packageName, 'check:metadata'])
    expect(await artifactExists('sitemap.xml')).toBe(false)

    run('content preview', ['--filter', packageName, 'build:content'])
    expect(await htmlFiles()).toEqual([
      '404.html',
      'index.html',
      'preview/services/template-demo/index.html',
    ])
    run('content preview metadata', ['--filter', packageName, 'check:metadata'], {
      CLINIC_ENABLE_SERVICE_PREVIEW: 'true',
    })

    run('staging build', ['--filter', packageName, 'build:staging'])
    expect(await htmlFiles()).toEqual(['404.html', 'index.html', ...supportingPages].sort())
    run('staging metadata', ['--filter', packageName, 'check:metadata'], {
      CLINIC_SITE_MODE: 'staging',
    })
    expect(await artifactExists('sitemap.xml')).toBe(false)
    expect(await readFile(resolve(appDir, 'dist/index.html'), 'utf8')).toContain(
      '<meta name="robots" content="noindex,nofollow">',
    )

    expect(() =>
      run('staging preview forbidden', ['--filter', packageName, 'build'], {
        CLINIC_SITE_MODE: 'staging',
        CLINIC_ENABLE_SERVICE_PREVIEW: 'true',
      }),
    ).toThrow('service preview is disabled')
    expect(() =>
      run('invalid build mode', ['--filter', packageName, 'build'], {
        CLINIC_SITE_MODE: 'public',
      }),
    ).toThrow('CLINIC_SITE_MODE')
    expect(() =>
      run('unguarded production', ['--filter', packageName, 'build:production']),
    ).toThrow('CLINIC_ALLOW_PRODUCTION_BUILD')
    expect(() =>
      run('unknown host', ['--filter', packageName, 'build:production'], {
        ...production,
        CLINIC_CANONICAL_ORIGIN: 'https://unknown',
      }),
    ).toThrow('CLINIC_CANONICAL_ORIGIN')
    expect(() =>
      run('insecure origin', ['--filter', packageName, 'build:production'], {
        ...production,
        CLINIC_CANONICAL_ORIGIN: 'http://havenhub.example',
      }),
    ).toThrow('CLINIC_CANONICAL_ORIGIN')

    run('gated production', ['--filter', packageName, 'build:production'], production)
    expect(await htmlFiles()).toEqual(['404.html', 'index.html', ...supportingPages].sort())
    run('production metadata', ['--filter', packageName, 'check:metadata'], {
      ...production,
      CLINIC_SITE_MODE: 'production',
    })

    const home = await readFile(resolve(appDir, 'dist/index.html'), 'utf8')
    expect(home).toContain('<meta name="robots" content="index,follow">')
    expect(home).toContain('<link rel="canonical" href="https://havenhub.example/">')
    expect(await artifactExists('sitemap.xml')).toBe(true)
    const sitemap = await readFile(resolve(appDir, 'dist/sitemap.xml'), 'utf8')
    expect(sitemap.match(/<loc>/g)).toHaveLength(1)
    expect(sitemap).toContain('<loc>https://havenhub.example/</loc>')
    const robots = await readFile(resolve(appDir, 'dist/robots.txt'), 'utf8')
    expect(robots).not.toMatch(/Disallow:/i)

    run('restored normal build', ['--filter', packageName, 'build:normal'])
    expect(await htmlFiles()).toEqual(['404.html', 'index.html'])
    expect(await artifactExists('sitemap.xml')).toBe(false)
  } finally {
    run('restore normal build after test', ['--filter', packageName, 'build:normal'])
  }
})
