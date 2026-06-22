import { collection, doc, updateDoc, writeBatch, query, orderBy, limit } from 'firebase/firestore'
import { useCollection } from 'vuefire'
import type { SuiteNotification } from '~/types/suite'

export function useNotifications() {
  const db = useFirestore()
  const user = useCurrentUser()

  const notifications = useCollection<SuiteNotification>(
    computed(() => {
      if (!user.value) return null
      return query(
        collection(db, 'users', user.value.uid, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
    })
  )

  const unreadCount = computed(
    () => (notifications.value ?? []).filter(n => !n.read).length
  )

  async function markRead(id: string) {
    if (!user.value) return
    await updateDoc(doc(db, 'users', user.value.uid, 'notifications', id), { read: true })
  }

  async function markAllRead() {
    if (!user.value) return
    const unread = (notifications.value ?? []).filter(n => !n.read)
    if (!unread.length) return
    const batch = writeBatch(db)
    for (const n of unread) {
      batch.update(doc(db, 'users', user.value.uid, 'notifications', n.id), { read: true })
    }
    await batch.commit()
  }

  return { notifications, unreadCount, markRead, markAllRead }
}
