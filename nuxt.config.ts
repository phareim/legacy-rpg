export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  modules: ['@nuxt/eslint', '@nuxt/image', '@nuxt/ui'],

  nitro: {
    preset: 'cloudflare-pages'
  },

  runtimeConfig: {
    veniceKey: ''
  }
})
