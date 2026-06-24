import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import type { H3Event } from 'h3'

function ensureInitialized() {
  if (getApps().length > 0) return
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FIREBASE_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY must all be set')
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

export function adminAuth() {
  ensureInitialized()
  return getAuth()
}

export function adminDb() {
  ensureInitialized()
  return getFirestore()
}

/** Verify the Bearer token in the request and return the Firebase uid. */
export async function verifyRequest(event: H3Event): Promise<string> {
  const header = getHeader(event, 'authorization')
  if (!header?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  try {
    const decoded = await adminAuth().verifyIdToken(header.slice(7))
    return decoded.uid
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }
}
