<script setup lang="ts">
import { collection, query, orderBy, limit, where, Timestamp } from 'firebase/firestore'
import { useCollection } from 'vuefire'
import type { ActivityEvent } from '~/types/suite'

useSeoMeta({ title: 'Dashboard' })

const db = useFirestore()
const user = useCurrentUser()

const activityFeed = useCollection<ActivityEvent>(
  computed(() => {
    if (!user.value) return null
    return query(
      collection(db, 'users', user.value.uid, 'activity'),
      orderBy('createdAt', 'desc'),
      limit(30)
    )
  })
)

const allTasks = useCollection(
  computed(() => user.value
    ? collection(db, 'users', user.value.uid, 'pm_tasks')
    : null
  )
)

const allProjects = useCollection(
  computed(() => user.value
    ? collection(db, 'users', user.value.uid, 'pm_projects')
    : null
  )
)

const todayStart = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)))

const todaySessions = useCollection(
  computed(() => {
    if (!user.value) return null
    return query(
      collection(db, 'users', user.value.uid, 'pm_timers'),
      where('startTime', '>=', todayStart),
      where('endTime', '!=', null)
    )
  })
)

const stats = computed(() => {
  const tasks = allTasks.value ?? []
  const projects = allProjects.value ?? []
  const sessions = todaySessions.value ?? []

  const todayMs = sessions.reduce((sum: number, s: any) => sum + (s.duration ?? 0), 0)
  const todayMinutes = Math.round(todayMs / 60000)
  const hours = Math.floor(todayMinutes / 60)
  const mins = todayMinutes % 60
  const timeLogged = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999))
  const tasksDueToday = tasks.filter((t: any) => {
    if (!t.dueDate || t.status === 'done') return false
    const d = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate)
    return d <= todayEnd
  }).length

  return [
    {
      label: 'Active projects',
      value: projects.filter((p: any) => p.status === 'active').length,
      icon: 'i-lucide-folder-kanban',
      color: 'text-violet-400'
    },
    {
      label: 'Open tasks',
      value: tasks.filter((t: any) => t.status !== 'done').length,
      icon: 'i-lucide-circle-dot',
      color: 'text-blue-400'
    },
    {
      label: 'Due today',
      value: tasksDueToday,
      icon: 'i-lucide-calendar-clock',
      color: 'text-amber-400'
    },
    {
      label: 'Time logged today',
      value: timeLogged || '0m',
      icon: 'i-lucide-timer',
      color: 'text-emerald-400'
    }
  ]
})

const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

const unreadNotifications = computed(() => (notifications.value ?? []).filter(n => !n.read))

const eventIcon: Record<string, string> = {
  'task.created': 'i-lucide-circle-plus',
  'task.completed': 'i-lucide-circle-check',
  'project.created': 'i-lucide-folder-plus',
  'project.completed': 'i-lucide-folder-check',
  'timer.stopped': 'i-lucide-timer-off',
  'note.created': 'i-lucide-file-plus'
}

const sourceLabel: Record<string, string> = {
  pm: 'PM'
}

function icon(type: string) {
  return eventIcon[type] ?? 'i-lucide-activity'
}

function formatTime(ts: any): string {
  if (!ts) return ''
  const date: Date = ts.toDate ? ts.toDate() : new Date(ts)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
</script>

<template>
  <UContainer class="py-10 space-y-8">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-muted mt-1">Your Suite at a glance.</p>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-xl border border-default bg-default p-5 flex flex-col gap-2"
      >
        <div class="flex items-center gap-2 text-muted">
          <UIcon :name="stat.icon" class="size-4" :class="stat.color" />
          <span class="text-xs font-medium">{{ stat.label }}</span>
        </div>
        <p class="text-2xl font-bold tracking-tight">{{ stat.value }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Activity feed -->
      <div class="lg:col-span-2 rounded-xl border border-default bg-default overflow-hidden">
        <div class="px-5 py-4 border-b border-default flex items-center justify-between">
          <h2 class="font-semibold text-sm">Recent Activity</h2>
          <span class="text-xs text-muted">{{ activityFeed?.length ?? 0 }} events</span>
        </div>

        <div class="divide-y divide-default">
          <div
            v-if="!activityFeed?.length"
            class="flex flex-col items-center justify-center py-12 gap-2 text-muted"
          >
            <UIcon name="i-lucide-activity" class="size-8 opacity-25" />
            <p class="text-sm">No activity yet. Start working in your apps!</p>
          </div>

          <div
            v-for="event in activityFeed"
            :key="event.id"
            class="flex items-start gap-3 px-5 py-3"
          >
            <UIcon :name="icon(event.type)" class="size-4 mt-0.5 shrink-0 text-muted" />
            <div class="min-w-0 flex-1">
              <p class="text-sm truncate">{{ event.summary }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-muted/60 uppercase tracking-wide">
                  {{ sourceLabel[event.source] ?? event.source }}
                </span>
                <span class="text-muted/40 text-xs">·</span>
                <span class="text-xs text-muted/60">{{ formatTime(event.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Unread notifications -->
      <div class="rounded-xl border border-default bg-default overflow-hidden">
        <div class="px-5 py-4 border-b border-default flex items-center justify-between">
          <h2 class="font-semibold text-sm">Notifications</h2>
          <div class="flex items-center gap-2">
            <span v-if="unreadCount > 0" class="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
              {{ unreadCount }} unread
            </span>
            <UButton
              v-if="unreadCount > 0"
              variant="ghost"
              color="neutral"
              size="xs"
              label="Clear all"
              @click="markAllRead"
            />
          </div>
        </div>

        <div class="divide-y divide-default">
          <div
            v-if="!unreadNotifications.length"
            class="flex flex-col items-center justify-center py-12 gap-2 text-muted"
          >
            <UIcon name="i-lucide-bell-off" class="size-8 opacity-25" />
            <p class="text-sm">All caught up!</p>
          </div>

          <button
            v-for="n in unreadNotifications"
            :key="n.id"
            class="w-full flex gap-3 px-5 py-3 text-left hover:bg-elevated transition-colors bg-primary/5"
            @click="markRead(n.id)"
          >
            <UIcon :name="icon(n.type)" class="size-4 mt-0.5 shrink-0 text-primary" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ n.title }}</p>
              <p class="text-xs text-muted truncate">{{ n.body }}</p>
              <p class="text-xs text-muted/60 mt-0.5">{{ formatTime(n.createdAt) }}</p>
            </div>
          </button>
        </div>

        <div v-if="notifications && notifications.length > unreadNotifications.length" class="border-t border-default px-5 py-3">
          <p class="text-xs text-muted">
            {{ notifications.length - unreadNotifications.length }} read notification{{ notifications.length - unreadNotifications.length === 1 ? '' : 's' }} hidden
          </p>
        </div>
      </div>
    </div>
  </UContainer>
</template>
