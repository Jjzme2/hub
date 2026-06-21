import { defineStore } from 'pinia'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import type { UserPreferences } from '~/types/suite'

const DEFAULTS: UserPreferences = {
  theme: 'system',
  primaryColor: 'violet',
  neutralColor: 'zinc'
}

export const usePreferencesStore = defineStore('preferences', () => {
  const db = useFirestore()
  const colorMode = useColorMode()
  const appConfig = useAppConfig()

  const preferences = ref<UserPreferences>({ ...DEFAULTS })
  let activeUid: string | null = null
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let loading = false

  function apply() {
    colorMode.preference = preferences.value.theme
    appConfig.ui.colors.primary = preferences.value.primaryColor
    appConfig.ui.colors.neutral = preferences.value.neutralColor
  }

  async function load(uid: string) {
    activeUid = uid
    loading = true
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      const saved = snap.data().preferences as Partial<UserPreferences> | undefined
      if (saved) Object.assign(preferences.value, saved)
    }
    apply()
    loading = false
  }

  function reset() {
    if (saveTimer) clearTimeout(saveTimer)
    activeUid = null
    loading = false
    preferences.value = { ...DEFAULTS }
  }

  watch(preferences, () => {
    if (loading || !activeUid) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      updateDoc(doc(db, 'users', activeUid!), { preferences: toRaw(preferences.value) })
    }, 600)
  }, { deep: true })

  return { preferences, load, reset, apply }
})
