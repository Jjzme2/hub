import * as Sentry from '@sentry/nuxt'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    logWarn('Cross-token request missing or malformed Authorization header', {
      ip: getRequestIP(event)
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const idToken = authHeader.slice(7)
  const callback = getQuery(event).callback as string | undefined

  const config = useRuntimeConfig()
  const allowedOrigins = (config.allowedAppOrigins as string)
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

  if (callback && allowedOrigins.length > 0) {
    try {
      const origin = new URL(callback).origin
      if (!allowedOrigins.includes(origin)) {
        logWarn('Cross-token callback origin not in allowlist', { origin, allowedOrigins })
        throw createError({ statusCode: 403, statusMessage: 'Callback origin not allowed' })
      }
    } catch (e: any) {
      if (e.statusCode) throw e
      logWarn('Cross-token callback URL is malformed', { callback })
      throw createError({ statusCode: 400, statusMessage: 'Invalid callback URL' })
    }
  }

  try {
    const auth = adminAuth()
    const decoded = await auth.verifyIdToken(idToken)

    Sentry.setUser({ id: decoded.uid, email: decoded.email })
    logInfo('Cross-token: ID token verified', { uid: decoded.uid, callback })

    const customToken = await auth.createCustomToken(decoded.uid)
    logInfo('Cross-token: custom token issued', { uid: decoded.uid })

    return { token: customToken }
  } catch (e: any) {
    if (e.statusCode) throw e
    logError('Cross-token: token verification or creation failed', e, { callback })
    throw createError({ statusCode: 401, statusMessage: 'Invalid ID token' })
  }
})
