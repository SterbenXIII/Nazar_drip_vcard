import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'static',
  vite: {
    server: { strictPort: true },
    preview: { strictPort: true },
  },
})
