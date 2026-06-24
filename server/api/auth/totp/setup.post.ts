import { authenticator } from 'otplib'

export default defineEventHandler(async (event) => {
  const uid = await verifyRequest(event)
  const snap = await adminDb().doc(`users/${uid}`).get()
  const email = snap.data()?.email ?? uid

  const secret = authenticator.generateSecret()
  const otpauthUri = authenticator.keyuri(email, 'ILYTAT Suite', secret)

  return { secret, otpauthUri }
})
