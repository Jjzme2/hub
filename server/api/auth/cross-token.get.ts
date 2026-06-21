export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
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
        throw createError({ statusCode: 403, statusMessage: 'Callback origin not allowed' })
      }
    } catch (e: any) {
      if (e.statusCode) throw e
      throw createError({ statusCode: 400, statusMessage: 'Invalid callback URL' })
    }
  }

  try {
    const auth = adminAuth()
    const decoded = await auth.verifyIdToken(idToken)
    const customToken = await auth.createCustomToken(decoded.uid)
    return { token: customToken }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid ID token' })
  }
})
