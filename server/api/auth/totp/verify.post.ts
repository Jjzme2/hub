import { verifySync } from 'otplib'

export default defineEventHandler(async (event) => {
  const uid = await verifyRequest(event)
  const { code } = await readBody<{ code: string }>(event)

  const snap = await adminDb().doc(`users/${uid}`).get()
  const totp = snap.data()?.totp as { secret?: string; enabled?: boolean } | undefined

  if (!totp?.enabled || !totp?.secret) {
    throw createError({ statusCode: 400, statusMessage: '2FA not configured' })
  }

  const { valid } = verifySync({ secret: totp.secret, token: code.replace(/\s/g, ''), type: 'totp' })
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification code' })
  }

  return { ok: true }
})
