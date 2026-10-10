import process from 'node:process'

const slots = {
  IMG_0905: { variable: 'HAVENHUB_STAGING_IMG_0905_URL', basename: 'img-0905' },
  IMG_0907: { variable: 'HAVENHUB_STAGING_IMG_0907_URL', basename: 'img-0907' },
}

export function resolveStagingIllustration(slot, mode, environment = process.env) {
  if (mode !== 'staging') return null

  const config = slots[slot]
  if (!config) throw new Error('Unknown staging illustration slot')

  const url = environment[config.variable]
  if (url === undefined) return null

  const expected = new RegExp(
    `^/__havenhub_staging_media__/${config.basename}\\.(?:webp|png|jpe?g|avif)$`,
  )
  if (typeof url !== 'string' || !expected.test(url)) {
    throw new Error(
      `${config.variable} must be a same-origin /__havenhub_staging_media__/${config.basename} image path`,
    )
  }

  return url
}
