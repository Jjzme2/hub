import { authenticator } from 'otplib'

export default defineEventHandler(async (event) => {
  const uid = await verifyRequest(event)
  const { secret, code } = await readBody<{ secret: string; code: string }>(event)

  if (!secret || !code) {
    throw createError({ statusCode: 400, statusMessage: 'secret and code are required' })
  }

  const isValid = authenticator.verify({ token: code.replace(/\s/g, ''), secret })
  if (!isValid) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification code' })
  }

  await adminDb().doc(`users/${uid}`).update({ totp: { secret, enabled: true } })

  return { ok: true }
})
