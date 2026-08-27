import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the PWA service worker via the official vite-pwa virtual module.
 * This replaces any manual navigator.serviceWorker.register() calls.
 * The SW is registered with `immediate: true` so it activates as fast as possible.
 */
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(swScriptUrl: string) {
    console.log('[PWA] SW registered:', swScriptUrl)
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline')
  },
  onNeedRefresh() {
    // autoUpdate is on — this won't fire in normal usage,
    // but kept here for logging during development.
    console.log('[PWA] New content available, auto-updating...')
    updateSW(true)
  },
  onRegisterError(error: unknown) {
    console.error('[PWA] SW registration failed:', error)
  },
})
