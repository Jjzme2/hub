import * as Sentry from '@sentry/nuxt'

Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://415b9cb774db23cee9eb2575a72cf5c6@o4511605235122176.ingest.us.sentry.io/4511605243576320',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  enableLogs: true,
  sendDefaultPii: true,
  debug: process.env.NODE_ENV !== 'production',
})
