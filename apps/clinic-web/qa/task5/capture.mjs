/* global console, document, getComputedStyle, window */

import { chromium } from '@playwright/test'

const browser = await chromium.launch()
for (const width of [320, 390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await page.goto('http://127.0.0.1:4333/')
  await page.evaluate(() => document.fonts.ready)
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    sansLoaded: document.fonts.check('400 16px "IBM Plex Sans"'),
    serifLoaded: document.fonts.check('600 32px "IBM Plex Serif"'),
    bodyFont: getComputedStyle(document.body).fontFamily,
    headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
  }))
  await page.screenshot({ path: `qa/task5/landing-${width}-first.png` })
  await page.screenshot({ path: `qa/task5/landing-${width}-full.png`, fullPage: true })
  console.log('landing', width, metrics)
  if ([390, 1440].includes(width)) {
    await page.goto('http://127.0.0.1:4333/programa/')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `qa/task5/programa-${width}-full.png`, fullPage: true })
    console.log(
      'programa',
      width,
      await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        primary: getComputedStyle(document.querySelector('.support-contact')).backgroundColor,
      })),
    )
  }
  await page.close()
}
await browser.close()
