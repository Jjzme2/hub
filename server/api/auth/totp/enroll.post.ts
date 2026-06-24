import { verifySync } from 'otplib'

export default defineEventHandler(async (event) => {
  const uid = await verifyRequest(event)
  const { secret, code } = await readBody<{ secret: string; code: string }>(event)

  if (!secret || !code) {
    throw createError({ statusCode: 400, statusMessage: 'secret and code are required' })
  }

  const { valid } = verifySync({ secret, token: code.replace(/\s/g, ''), type: 'totp' })
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification code' })
  }

  await adminDb().doc(`users/${uid}`).update({ totp: { secret, enabled: true } })

  return { ok: true }
})
