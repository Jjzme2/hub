import * as Sentry from '@sentry/nuxt'

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN || 'https://415b9cb774db23cee9eb2575a72cf5c6@o4511605235122176.ingest.us.sentry.io/4511605243576320',
  environment: import.meta.env.PROD ? 'production' : 'development',

  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration()],

  enableLogs: true,
  sendDefaultPii: true,
  debug: !import.meta.env.PROD,
})
