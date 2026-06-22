import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

export function useAuth() {
  const auth = useFirebaseAuth()!
  const db = useFirestore()
  const store = useAuthStore()

  async function ensureUserDoc(uid: string, email: string | null, displayName?: string | null) {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', uid), {
        email,
        displayName: displayName || '',
        username: '',
        birthday: '',
        isAdmin: store.adminEmails.includes(email?.toLowerCase() ?? ''),
        createdAt: serverTimestamp()
      })
    }
    await store.loadUserDoc(uid, email)
  }

  async function loginWithEmail(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    await ensureUserDoc(cred.user.uid, cred.user.email, cred.user.displayName)
    return cred
  }

  async function registerWithEmail(
    email: string,
    password: string,
    profile: { displayName: string, username: string, birthday: string },
    token?: string
  ) {
    const isAdminEmail = store.adminEmails.includes(email.toLowerCase())

    if (!isAdminEmail) {
      if (!token) throw new Error('An invite is required to register')
      const inviteRef = doc(db, 'invites', token)
      const inviteSnap = await getDoc(inviteRef)
      if (!inviteSnap.exists()) throw new Error('Invalid invite token')
      const invite = inviteSnap.data()
      if (invite.usedAt) throw new Error('This invite has already been used')
      if (invite.email.toLowerCase() !== email.toLowerCase()) throw new Error('Email does not match this invite')
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password)

    await updateProfile(cred.user, { displayName: profile.displayName })
    await sendEmailVerification(cred.user)

    const writes: Promise<void>[] = [
      setDoc(doc(db, 'users', cred.user.uid), {
        email,
        displayName: profile.displayName,
        username: profile.username.toLowerCase().trim(),
        birthday: profile.birthday,
        isAdmin: isAdminEmail,
        createdAt: serverTimestamp()
      })
    ]

    if (!isAdminEmail && token) {
      writes.push(
        setDoc(doc(db, 'invites', token), { usedAt: serverTimestamp(), usedByUid: cred.user.uid }, { merge: true })
      )
    }

    await Promise.all(writes)
    await store.loadUserDoc(cred.user.uid, email)
    return cred
  }

  async function updateUserProfile(uid: string, data: { displayName?: string, username?: string, birthday?: string }) {
    const user = auth.currentUser
    if (!user) throw new Error('Not signed in')
    if (data.displayName !== undefined) {
      await updateProfile(user, { displayName: data.displayName })
    }
    await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() })
  }

  // Requires re-authentication first; sends a verification link to the new address
  async function changeEmail(currentPassword: string, newEmail: string) {
    const user = auth.currentUser
    if (!user || !user.email) throw new Error('Not signed in')
    const cred = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, cred)
    await verifyBeforeUpdateEmail(user, newEmail)
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const user = auth.currentUser
    if (!user || !user.email) throw new Error('Not signed in')
    const cred = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, cred)
    await updatePassword(user, newPassword)
  }

  async function resendVerificationEmail() {
    const user = auth.currentUser
    if (!user) throw new Error('Not signed in')
    await sendEmailVerification(user)
  }

  async function reloadUser() {
    await auth.currentUser?.reload()
  }

  async function logout() {
    await signOut(auth)
  }

  return {
    loginWithEmail,
    loginWithGoogle,
    registerWithEmail,
    updateUserProfile,
    changeEmail,
    changePassword,
    resendVerificationEmail,
    reloadUser,
    logout
  }
}
