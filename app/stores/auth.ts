import { defineStore } from 'pinia'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = useCurrentUser()
  const db = useFirestore()
  const auth = useFirebaseAuth()!
  const config = useRuntimeConfig()

  const preferencesStore = usePreferencesStore()

  const isAdmin = ref(false)
  const isDisabled = ref(false)
  const isAdminLoading = ref(true)

  const adminEmails = computed<string[]>(() =>
    (config.public.adminEmails as string)
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean)
  )

  async function loadUserDoc(uid: string, email?: string | null) {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      const data = snap.data()
      isAdmin.value = data.isAdmin ?? false
      isDisabled.value = data.isDisabled ?? false
      if (isDisabled.value) {
        await signOut(auth)
      }
    } else {
      const isAdminUser = adminEmails.value.includes(email?.toLowerCase() ?? '')
      await setDoc(doc(db, 'users', uid), {
        email,
        displayName: currentUser.value?.displayName ?? '',
        username: '',
        birthday: '',
        isAdmin: isAdminUser,
        createdAt: serverTimestamp()
      })
      isAdmin.value = isAdminUser
      isDisabled.value = false
    }
    isAdminLoading.value = false
    await preferencesStore.load(uid)
  }

  watch(currentUser, async (user) => {
    if (user === undefined) {
      isAdminLoading.value = true
      return
    }
    if (user) {
      await loadUserDoc(user.uid, user.email)
    } else {
      isAdmin.value = false
      isDisabled.value = false
      isAdminLoading.value = false
      preferencesStore.reset()
    }
  }, { immediate: true })

  return { currentUser, isAdmin, isDisabled, isAdminLoading, adminEmails, loadUserDoc }
})
