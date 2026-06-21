import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function ensureInitialized() {
  if (getApps().length > 0) return
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set')
  initializeApp({ credential: cert(JSON.parse(raw)) })
}

export function adminAuth() {
  ensureInitialized()
  return getAuth()
}

export function adminDb() {
  ensureInitialized()
  return getFirestore()
}
