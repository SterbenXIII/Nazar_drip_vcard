import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rcPath = resolve(process.cwd(), 'lighthouserc.json')
const originalConfig = readFileSync(rcPath, 'utf8')

// Parse config and modify it to scan everything
const config = JSON.parse(originalConfig)
// Delete explicit URL restriction so LHCI auto-discovers all HTML files in staticDistDir
delete config.ci.collect.url

try {
  // Write temporary config
  writeFileSync(rcPath, JSON.stringify(config, null, 2))

  console.log('🚀 Starting comprehensive Lighthouse CI run across ALL generated pages...')
  // Run LHCI
  execSync('pnpx @lhci/cli autorun', { stdio: 'inherit' })
} catch (_err) {
  console.error('\n❌ Lighthouse CI failed. See output above.')
  process.exit(1)
} finally {
  // Always restore original config
  writeFileSync(rcPath, originalConfig)
  console.log('✅ Restored original lighthouserc.json')
}
