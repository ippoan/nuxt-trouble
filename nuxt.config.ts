// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080',
      authWorkerUrl: process.env.NUXT_PUBLIC_AUTH_WORKER_URL || '',
      stagingTenantId: process.env.NUXT_PUBLIC_STAGING_TENANT_ID || '',
    },
  },

  nitro: {
    preset: 'cloudflare_module',
  },

  vite: {
    server: {
      allowedHosts: ['nuxt-trouble.dev.ippoan.org', '.trycloudflare.com'],
    },
    optimizeDeps: {
      // @ippoan/auth-client は .ts ソースで公開されており Vite の dep pre-bundle で
      // `#imports` の解決がバグって invalid JS になる。exclude で SSR/ESM 経路に委ねる。
      exclude: ['@ippoan/auth-client'],
    },
  },

  modules: [
    '@nuxt/ui',
  ],

  css: ['~/assets/css/main.css'],

  typescript: {
    tsConfig: {
      compilerOptions: {
        skipLibCheck: true,
      },
    },
  },
})
