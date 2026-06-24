import * as Sentry from '@sentry/nuxt'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from './firebase'

type LogLevel = 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

function persistLog(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  try {
    const entry: Record<string, unknown> = {
      level,
      message,
      createdAt: FieldValue.serverTimestamp()
    }
    if (context && Object.keys(context).length) entry.context = context
    if (error instanceof Error) {
      entry.errorMessage = error.message
      if (error.stack) entry.errorStack = error.stack
    } else if (error !== undefined) {
      entry.errorMessage = String(error)
    }
    adminDb().collection('hub_logs').add(entry).catch(() => {})
  } catch {}
}

export function logInfo(message: string, context?: LogContext) {
  console.info(`[INFO] ${message}`, context ?? '')
  persistLog('info', message, context)
}

export function logWarn(message: string, context?: LogContext) {
  console.warn(`[WARN] ${message}`, context ?? '')
  Sentry.captureMessage(message, { level: 'warning', extra: context })
  persistLog('warn', message, context)
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
  persistLog('error', message, context, error)
}
