import fs from 'node:fs'

import { PNG } from 'pngjs'

function generateScreenshot(width, height, color, outputPath) {
  const png = new PNG({ width, height })

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2
      png.data[idx] = color.r
      png.data[idx + 1] = color.g
      png.data[idx + 2] = color.b
      png.data[idx + 3] = 255
    }
  }

  png.pack().pipe(fs.createWriteStream(outputPath))
  console.log(`Generated ${outputPath}`)
}

// Generate wide screenshot (Desktop)
generateScreenshot(1280, 720, { r: 44, g: 62, b: 80 }, './public/assets/pwa-screenshot-wide.png')

// Generate narrow screenshot (Mobile)
generateScreenshot(
  750,
  1334,
  { r: 52, g: 125, b: 100 },
  './public/assets/pwa-screenshot-narrow.png',
)
