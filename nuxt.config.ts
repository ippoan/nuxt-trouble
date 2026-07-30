// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    // /api/proxy/* (server route) が introspect 検証後に forward する rust-alc-api。
    alcApiUrl: process.env.NUXT_ALC_API_URL || 'https://rust-alc-api-747065218280.asia-northeast1.run.app',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080',
      authWorkerUrl: process.env.NUXT_PUBLIC_AUTH_WORKER_URL || '',
      stagingTenantId: process.env.NUXT_PUBLIC_STAGING_TENANT_ID || '',
    },
  },

  nitro: {
    preset: 'cloudflare_module',
  },

  experimental: {
    // 既定の 'automatic' は chunk load 失敗時に素のリロードをするだけで HTTP
    // キャッシュをバイパスしない。release 直後に踏んだ 404 は immutable
    // キャッシュに焼き付くためそれでは復旧できないので、'manual' にして
    // app/plugins/chunk-reload.client.ts に制御を渡す (Refs #236)。
    emitRouteChunkError: 'manual',
  },

  // @ippoan/auth-client を SSR/Nitro 経路で transpile (root import は .ts + .vue)。
  build: {
    transpile: ['@ippoan/auth-client'],
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
