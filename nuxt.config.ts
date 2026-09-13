import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode', '@nuxt/fonts'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'lang',
      cookieSecure: process.env.NODE_ENV === 'production',
      fallbackLocale: 'en',
    },
    locales: [
      { code: 'nl', language: 'nl-NL', name: 'Nederlands', file: 'nl.json' },
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
    ],
  },

  // classSuffix '' makes the class `dark`, which Tailwind's dark variant keys on (see main.css).
  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
    storage: 'cookie',
    storageKey: 'theme',
    cookieAttrs: { maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
  },

  // Self-hosted: @nuxt/fonts downloads these at build time and serves them from this site.
  fonts: {
    families: [
      { name: 'Oxygen', weights: [700], global: true },
      { name: 'Source Sans 3', weights: [300, 400, 600], styles: ['normal', 'italic'], global: true },
    ],
  },

  runtimeConfig: {
    public: {
      contactEmail: '',
      linkedinUrl: '',
    },
  },
})
