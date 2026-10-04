import { spawn, execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const appDir = resolve(import.meta.dirname, '..')
const repoDir = resolve(appDir, '../..')
const packageName = '@vcard/clinic-web'
const diagnosticDir = await mkdtemp(join(tmpdir(), 'clinic-acceptance-'))
const tempDir = join(diagnosticDir, 'tmp')
await mkdir(tempDir)
await writeFile(join(diagnosticDir, 'empty.env'), '')

const env = Object.fromEntries(
  ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TERM', 'XDG_CACHE_HOME', 'PLAYWRIGHT_BROWSERS_PATH']
    .filter((name) => process.env[name] !== undefined)
    .map((name) => [name, process.env[name]]),
)
Object.assign(env, {
  CI: '1',
  TMPDIR: tempDir,
  DOTENV_CONFIG_PATH: join(diagnosticDir, 'empty.env'),
})

let activeChild
let interrupted = false

function stopOwnProcessGroup(signal = 'SIGTERM') {
  interrupted = true
  if (!activeChild?.pid) return
  killGroup(activeChild.pid, signal)
}

function killGroup(pid, signal = 'SIGTERM') {
  try {
    process.kill(process.platform === 'win32' ? pid : -pid, signal)
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}

process.on('SIGINT', () => stopOwnProcessGroup('SIGINT'))
process.on('SIGTERM', () => stopOwnProcessGroup('SIGTERM'))

async function run(label, command, args, extraEnv = {}) {
  if (interrupted) throw new Error('Acceptance interrupted')
  console.log(`\n[clinic acceptance] ${label}`)
  const output = []
  const child = spawn(command, args, {
    cwd: repoDir,
    env: { ...env, ...extraEnv },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  activeChild = child
  child.stdout.on('data', (chunk) => {
    output.push(chunk)
    process.stdout.write(chunk)
  })
  child.stderr.on('data', (chunk) => {
    output.push(chunk)
    process.stderr.write(chunk)
  })

  let result
  try {
    result = await new Promise((resolveResult, reject) => {
      child.once('error', reject)
      child.once('close', (code, signal) => resolveResult({ code, signal }))
    })
  } finally {
    activeChild = undefined
    await writeFile(join(diagnosticDir, `${label}.log`), Buffer.concat(output))
    if (child.pid) killGroup(child.pid)
  }
  if (result.code !== 0 || result.signal) {
    throw new Error(`${label} failed: exit ${result.code ?? result.signal}`)
  }
}

async function findFreePort() {
  const server = createServer()
  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  await new Promise((resolveClose) => server.close(resolveClose))
  if (!address || typeof address === 'string') throw new Error('Could not reserve a local port')
  return address.port
}

async function browser(label, files, preview) {
  const port = await findFreePort()
  await run(
    label,
    'pnpm',
    [
      '--filter',
      packageName,
      'exec',
      'playwright',
      'test',
      '--config',
      'playwright.config.ts',
      '--workers=1',
      '--retries=0',
      ...files,
    ],
    {
      CLINIC_ACCEPTANCE_PORT: String(port),
      CLINIC_ACCEPTANCE_BASE_URL: `http://127.0.0.1:${port}`,
      CLINIC_ACCEPTANCE_ARTIFACT_DIR: join(diagnosticDir, label),
      CLINIC_ACCEPTANCE_USE_BUILD: 'true',
      CLINIC_ENABLE_SERVICE_PREVIEW: String(preview),
    },
  )
}

try {
  const major = Number(process.versions.node.split('.')[0])
  const pnpmVersion = execFileSync('pnpm', ['--version'], { encoding: 'utf8', env }).trim()
  await writeFile(
    join(diagnosticDir, 'runtime.txt'),
    `Node ${process.version}\npnpm ${pnpmVersion}\n`,
  )
  if (major < 24 || pnpmVersion !== '10.29.1') {
    throw new Error(`Requires Node >=24 and pnpm 10.29.1; found ${process.version}, ${pnpmVersion}`)
  }

  const localEnvFiles = (await readdir(appDir)).filter(
    (name) => /^\.env(?:\..+)?$/.test(name) && name !== '.env.example',
  )
  if (localEnvFiles.length) {
    throw new Error(
      `Clinic-local environment files must be removed from acceptance: ${localEnvFiles.join(', ')}`,
    )
  }

  console.log('\n[clinic acceptance] native-sqlite')
  try {
    execFileSync(
      process.execPath,
      ['-e', "const Database = require('better-sqlite3'); new Database(':memory:').close()"],
      { cwd: resolve(repoDir, 'apps/api'), env, stdio: 'pipe' },
    )
  } catch (error) {
    await writeFile(join(diagnosticDir, 'native-sqlite.log'), error.stderr ?? String(error))
    throw new Error(
      `better-sqlite3 cannot open SQLite under Node ${process.version} (ABI ${process.versions.modules}). See docs/new-clinic/08-local-acceptance.md for the verified Node 24 frozen-install procedure. No reinstall was attempted.`,
    )
  }
  console.log('[clinic acceptance] native-sqlite PASS')

  await run('astro-check', 'pnpm', ['--filter', packageName, 'exec', 'astro', 'check'])
  await run('eslint', 'pnpm', ['--filter', packageName, 'lint'])
  await run('stylelint', 'pnpm', ['exec', 'stylelint', 'apps/clinic-web/src/**/*.{css,astro}'])
  await run('prettier', 'pnpm', [
    'exec',
    'prettier',
    '--check',
    'apps/clinic-web/**/*.{astro,js,mjs,json,ts}',
  ])

  await run(
    'mock-api',
    'pnpm',
    [
      '--filter',
      '@vcard/api',
      'exec',
      'vitest',
      'run',
      'src/tests/integration/lead-submission.test.ts',
      'src/tests/unit/notification.coordinator.test.ts',
      'src/tests/unit/telegram-messaging.provider.test.ts',
      'src/tests/unit/email.provider.test.ts',
    ],
    {
      NODE_OPTIONS: `--import=${pathToFileURL(join(appDir, 'scripts/block-network.mjs')).href}`,
    },
  )

  await run('normal-build', 'pnpm', ['--filter', packageName, 'build'], {
    CLINIC_ENABLE_SERVICE_PREVIEW: 'false',
  })
  await run('normal-metadata', 'pnpm', ['--filter', packageName, 'check:metadata'], {
    CLINIC_ENABLE_SERVICE_PREVIEW: 'false',
  })
  await browser(
    'normal-browser',
    ['e2e/homepage.spec.ts', 'e2e/lead-form.spec.ts', 'e2e/service-content.spec.ts'],
    false,
  )

  await run('preview-build', 'pnpm', ['--filter', packageName, 'build'], {
    CLINIC_ENABLE_SERVICE_PREVIEW: 'true',
  })
  await run('preview-metadata', 'pnpm', ['--filter', packageName, 'check:metadata'], {
    CLINIC_ENABLE_SERVICE_PREVIEW: 'true',
  })
  await browser('preview-browser', ['e2e/service-template.spec.ts'], true)

  await run('restore-normal-build', 'pnpm', ['--filter', packageName, 'build'], {
    CLINIC_ENABLE_SERVICE_PREVIEW: 'false',
  })
  await run('restored-metadata', 'pnpm', ['--filter', packageName, 'check:metadata'], {
    CLINIC_ENABLE_SERVICE_PREVIEW: 'false',
  })

  await rm(diagnosticDir, { recursive: true, force: true })
  console.log('\n[clinic acceptance] PASS — normal build restored; temporary output removed')
} catch (error) {
  console.error(`\n[clinic acceptance] FAIL — ${error.message}`)
  console.error(`[clinic acceptance] diagnostics: ${diagnosticDir}`)
  process.exitCode = 1
}
