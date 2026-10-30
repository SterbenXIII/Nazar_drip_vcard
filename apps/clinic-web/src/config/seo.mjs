import { isIP } from 'node:net'
import process from 'node:process'
import { URL } from 'node:url'

const modes = ['normal', 'staging', 'production']

export const homepageTitle = 'Центр реабілітації у Львівській області | HAVENHUB'
export const homepageDescription =
  'HAVENHUB: реабілітація у с. Ременів, амбулаторна допомога у Львові. Допомога при алкогольній, наркотичній та ігровій залежності. Звернення 24/7.'

export function resolveSeoConfig(environment = process.env) {
  const mode = environment.CLINIC_SITE_MODE ?? 'normal'
  if (!modes.includes(mode))
    throw new Error('CLINIC_SITE_MODE must be normal, staging or production')

  if (mode !== 'production') return { mode, canonicalOrigin: null }

  if (environment.CLINIC_ALLOW_PRODUCTION_BUILD !== 'true') {
    throw new Error('CLINIC_ALLOW_PRODUCTION_BUILD=true is required for production builds')
  }

  let parsed
  try {
    parsed = new URL(environment.CLINIC_CANONICAL_ORIGIN)
  } catch {
    throw new Error('CLINIC_CANONICAL_ORIGIN must be a valid HTTPS origin')
  }

  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname.includes('.') ||
    isIP(parsed.hostname) !== 0 ||
    parsed.hostname === 'localhost' ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.port
  ) {
    throw new Error('CLINIC_CANONICAL_ORIGIN must be a valid HTTPS origin')
  }

  return { mode, canonicalOrigin: parsed.origin + '/' }
}

export function resolvePageSeo(routePolicy, environment = process.env) {
  if (!['home', 'supporting', 'closed'].includes(routePolicy)) {
    throw new Error('Unknown HAVENHUB page policy')
  }
  const { mode, canonicalOrigin } = resolveSeoConfig(environment)
  if (mode === 'production' && routePolicy === 'home') {
    return { robots: 'index,follow', canonical: canonicalOrigin, social: true }
  }
  if (mode === 'production' && routePolicy === 'supporting') {
    return { robots: 'noindex,follow', canonical: null, social: false }
  }
  return { robots: 'noindex,nofollow', canonical: null, social: false }
}
