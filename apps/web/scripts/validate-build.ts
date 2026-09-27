import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '../dist')

const REQUIRED_PATHS = [
  'index.html',
  'ru/index.html',
  'sitemap-index.xml',
  'krapelnytsia-vid-alkoholnoi-intoksykatsii/index.html',
  'ru/kapelnitsa-ot-alkogolnoy-intoksikatsii/index.html',
  'lviv/index.html', // City Hub
  'ru/lviv/index.html', // City Hub RU
  '404.html',
]

console.log('🚀 Starting Build Validation...')

let failed = false

// 1. Check Required Files
console.log('📂 Checking critical files...')
for (const relPath of REQUIRED_PATHS) {
  const fullPath = path.join(DIST_DIR, relPath)
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Found: ${relPath}`)
  } else {
    console.error(`❌ Missing: ${relPath}`)
    failed = true
  }
}

// 2. Check Sitemap & Hreflang (Basic check by reading files)
console.log('🔗 Validating SEO markers...')
const indexHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8')
if (indexHtml.includes('hreflang="uk-UA"') && indexHtml.includes('hreflang="ru-UA"')) {
  console.log('✅ Hreflang tags detected in root index.html')
} else {
  console.error('❌ Hreflang tags missing in root index.html')
  failed = true
}

if (indexHtml.includes('application/ld+json')) {
  console.log('✅ JSON-LD Schema detected')
} else {
  console.error('❌ JSON-LD Schema missing')
  failed = true
}

// 3. Final Result
if (failed) {
  console.error('\n🛑 Build validation FAILED. Please check the logs above.')
  process.exit(1)
} else {
  console.log('\n✨ Build validation PASSED. Site is ready for deployment.')
}
