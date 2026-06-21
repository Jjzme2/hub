// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-only — auto-populated from NUXT_* env vars
    resendApiKey: '',
    resendFrom: '',
    r2AccountId: '',
    r2AccessKeyId: '',
    r2SecretAccessKey: '',
    r2BucketName: '',
    r2Endpoint: '',
    // Comma-separated origins allowed to request cross-app tokens (e.g. http://localhost:3001,https://pm.ilytat.com)
    allowedAppOrigins: process.env.NUXT_ALLOWED_APP_ORIGINS || '',
    public: {
      // ADMIN_EMAILS has no NUXT_ prefix so it must be mapped explicitly
      adminEmails: process.env.ADMIN_EMAILS || '',
      // Auto-populated from NUXT_PUBLIC_R2_PUBLIC_URL
      r2PublicUrl: ''
    }
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-vuefire',
    '@sentry/nuxt/module'
  ],

  sentry: {
    dsn: process.env.SENTRY_DSN,

    sourceMapsUploadOptions: {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN
    },

    org: 'ilytat',
    project: 'javascript-nuxt',
    autoInjectServerSentry: 'top-level-import'
  },

  vuefire: {
    auth: {
      enabled: true,
      sessionCookie: false
    },
    config: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    }
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],
  ssr: false,
  compatibilityDate: '2025-01-15',

  nitro: {
    externals: {
      inline: ['firebase', '@firebase', 'idb']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  sourcemap: {
    client: 'hidden'
  }
})