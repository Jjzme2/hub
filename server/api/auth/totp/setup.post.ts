import { generateSecret, generateURI } from 'otplib'

export default defineEventHandler(async (event) => {
  const uid = await verifyRequest(event)
  const snap = await adminDb().doc(`users/${uid}`).get()
  const email = snap.data()?.email ?? uid

  const secret = generateSecret()
  const otpauthUri = generateURI({ strategy: 'totp', issuer: 'ILYTAT Suite', label: email, secret })

  return { secret, otpauthUri }
})
