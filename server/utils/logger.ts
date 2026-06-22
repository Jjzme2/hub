import * as Sentry from '@sentry/nuxt'

type LogContext = Record<string, unknown>

export function logInfo(message: string, context?: LogContext) {
  console.info(`[INFO] ${message}`, context ?? '')
}

export function logWarn(message: string, context?: LogContext) {
  console.warn(`[WARN] ${message}`, context ?? '')
  Sentry.captureMessage(message, { level: 'warning', extra: context })
}

export function logError(message: string, error: unknown, context?: LogContext) {
  console.error(`[ERROR] ${message}`, context ?? '', error)
  Sentry.withScope((scope) => {
    if (context) scope.setContext('details', context)
    scope.setLevel('error')
    if (error instanceof Error) {
      Sentry.captureException(error)
    } else {
      Sentry.captureMessage(`${message}: ${String(error)}`, 'error')
    }
  })
}
