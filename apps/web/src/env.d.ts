/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/pwa-assets" />
/// <reference types="@vite-pwa/astro/client" />

// Chrome-only PWA install prompt — not in standard DOM types
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
}

declare module 'virtual:pwa-assets/head' {
  export const pwaAssetsHead: {
    themeColor: { content: string }
    links: Array<Record<string, string>>
  }
}

declare module 'virtual:pwa-info' {
  export const pwaInfo: {
    webManifest: { linkTag: string }
  }
}
