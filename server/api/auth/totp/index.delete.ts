import { FieldValue } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const uid = await verifyRequest(event)
  await adminDb().doc(`users/${uid}`).update({ totp: FieldValue.delete() })
  return { ok: true }
})
