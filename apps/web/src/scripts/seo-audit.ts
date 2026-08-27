import fs from 'node:fs'
import path from 'node:path'

/**
 * SEO Post-Build Audit Script
 *
 * Verifies that the built HTML files in the dist directory have:
 * 1. A valid <title> (not empty)
 * 2. A <meta name="description"> (not empty)
 * 3. Hreflang alternate links (for i18n)
 * 4. JSON-LD schema scripts
 *
 * Usage: tsx src/scripts/seo-audit.ts
 */

const DIST_DIR = path.resolve('dist')

async function auditSEO() {
  console.log('🚀 Starting SEO Audit...')

  if (!fs.existsSync(DIST_DIR)) {
    console.error(`❌ Dist directory not found at ${DIST_DIR}. Run "npm run build" first.`)
    process.exit(1)
  }

  const htmlFiles = findHtmlFiles(DIST_DIR)
  console.log(`📄 Found ${htmlFiles.length} HTML files to audit.`)

  let errorCount = 0

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const relPath = path.relative(DIST_DIR, file)

    const results = {
      title: content.match(/<title>(.*?)<\/title>/i),
      description: content.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i),
      hreflang: content.match(/<link\s+rel=["']alternate["']\s+hreflang=["']/i),
      jsonLd: content.match(/<script\s+type=["']application\/ld\+json["']/i),
    }

    const errors: string[] = []

    if (!results.title?.[1]?.trim()) {
      errors.push('Missing or empty <title>')
    }

    if (!results.description?.[1]?.trim()) {
      errors.push('Missing or empty <meta name="description">')
    }

    if (!results.hreflang) {
      errors.push('Missing hreflang alternate links')
    }

    if (!results.jsonLd) {
      errors.push('Missing JSON-LD schema')
    }

    if (errors.length > 0) {
      console.error(`❌ ${relPath}:`)
      errors.forEach((err) => console.error(`   - ${err}`))
      errorCount++
    }
  }

  console.log('\n📊 Audit Summary:')
  console.log(`✅ Files scanned: ${htmlFiles.length}`)
  console.log(`❌ Errors found: ${errorCount}`)

  if (errorCount > 0) {
    console.error('\n🛑 SEO Audit failed. Please fix the errors above.')
    process.exit(1)
  } else {
    console.log('\n✨ SEO Audit passed successfully!')
  }
}

function findHtmlFiles(dir: string): string[] {
  let results: string[] = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      results = results.concat(findHtmlFiles(fullPath))
    } else if (file.endsWith('.html')) {
      results.push(fullPath)
    }
  }
  return results
}

auditSEO().catch((err) => {
  console.error('Fatal audit error:', err)
  process.exit(1)
})
