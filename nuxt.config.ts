import tailwindcss from '@tailwindcss/vite'

const SITE_URL = 'https://overeem.io'
const PREVIEW_TITLE = 'Gerwin Overeem · Chat with my CV'
const PREVIEW_DESCRIPTION = 'Ask an AI about my CV, or request an intro meeting through the chat.'

const SECURITY_HEADERS = {
  'Content-Security-Policy': "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

const PERSON = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  'name': 'Gerwin Overeem',
  'url': `${SITE_URL}/`,
  'jobTitle': 'Senior Developer',
  'address': { '@type': 'PostalAddress', 'addressLocality': 'Apeldoorn', 'addressCountry': 'NL' },
  'sameAs': [process.env.NUXT_PUBLIC_LINKEDIN_URL].filter(Boolean),
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode', '@nuxt/fonts'],

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/**': { headers: SECURITY_HEADERS },
    // On Vercel, Nuxt's own cache rules for these paths match first and stop there, so they need the headers too.
    '/_nuxt/**': { headers: SECURITY_HEADERS },
    '/_nuxt/builds/**': { headers: SECURITY_HEADERS },
    '/_nuxt/builds/meta/**': { headers: SECURITY_HEADERS },
    '/_fonts/**': { headers: SECURITY_HEADERS },
    '/': { headers: { ...SECURITY_HEADERS, 'Cache-Control': 'private, no-cache', 'Vary': 'Accept-Language, Cookie' } },
  },

  imports: {
    dirs: ['types', 'constants', '../shared/constants'],
  },
  nitro: {
    imports: {
      dirs: ['server/types', 'server/constants', 'shared/constants'],
    },
    vercel: {
      functions: { regions: ['fra1'] },
    },
  },

  // Title and description follow the UI language (app/app.vue); everything here is the same for both.
  app: {
    head: {
      link: [
        { rel: 'canonical', href: `${SITE_URL}/` },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-152x152.png' },
        { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#f7b93a' },
      ],
      meta: [
        { name: 'theme-color', content: '#f7b93a' },
        { name: 'color-scheme', content: 'light dark' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Gerwin Overeem' },
        { property: 'og:locale', content: 'en_GB' },
        { property: 'og:url', content: `${SITE_URL}/` },
        { property: 'og:title', content: PREVIEW_TITLE },
        { property: 'og:description', content: PREVIEW_DESCRIPTION },
        { property: 'og:image', content: `${SITE_URL}/og-image.jpg` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: PREVIEW_TITLE },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      // Vercel Web Analytics: the script only exists on Vercel deployments, so it is only added there.
      script: [
        { type: 'application/ld+json', innerHTML: JSON.stringify(PERSON) },
        ...(process.env.VERCEL ? [{ src: '/_vercel/insights/script.js', defer: true }] : []),
      ],
    },
  },

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
