import { writeFile } from 'node:fs/promises'

export async function emitProductionSeoArtifacts(dir, canonicalOrigin) {
  if (!canonicalOrigin?.startsWith('https://')) {
    throw new Error('A verified HTTPS canonical origin is required for production sitemap')
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `  <url><loc>${canonicalOrigin}</loc></url>\n` +
    '</urlset>\n'

  await writeFile(new URL('sitemap.xml', dir), xml)
  await writeFile(
    new URL('robots.txt', dir),
    `User-agent: *\nAllow: /\nSitemap: ${canonicalOrigin}sitemap.xml\n`,
  )
}
