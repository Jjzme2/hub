<script setup lang="ts">
const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
const open = ref(false)
const bellRef = ref<HTMLElement | null>(null)

onClickOutside(bellRef, () => { open.value = false })

const eventIcon: Record<string, string> = {
  'task.created': 'i-lucide-circle-plus',
  'task.completed': 'i-lucide-circle-check',
  'project.created': 'i-lucide-folder-plus',
  'project.completed': 'i-lucide-folder-check',
  'timer.stopped': 'i-lucide-timer-off',
  'note.created': 'i-lucide-file-plus'
}

function icon(type: string) {
  return eventIcon[type] ?? 'i-lucide-bell'
}

async function handleClick(id: string) {
  await markRead(id)
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
  <div ref="bellRef" class="relative">
    <UButton
      icon="i-lucide-bell"
      color="neutral"
      variant="ghost"
      aria-label="Notifications"
      @click="open = !open"
    >
      <template v-if="unreadCount > 0" #trailing>
        <span class="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white leading-none">
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </template>
    </UButton>

    <div
      v-if="open"
      class="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl border border-default bg-default shadow-lg overflow-hidden"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-default">
        <span class="font-semibold text-sm">Notifications</span>
        <UButton
          v-if="unreadCount > 0"
          variant="ghost"
          color="neutral"
          size="xs"
          label="Mark all read"
          @click="markAllRead"
        />
      </div>

      <div class="max-h-96 overflow-y-auto divide-y divide-default">
        <div
          v-if="!notifications?.length"
          class="flex flex-col items-center justify-center py-10 gap-2 text-muted"
        >
          <UIcon name="i-lucide-bell-off" class="size-8 opacity-30" />
          <p class="text-sm">No notifications yet</p>
        </div>

        <button
          v-for="n in notifications"
          :key="n.id"
          class="w-full flex gap-3 px-4 py-3 text-left hover:bg-elevated transition-colors"
          :class="{ 'bg-primary/5': !n.read }"
          @click="handleClick(n.id)"
        >
          <UIcon
            :name="icon(n.type)"
            class="size-4 mt-0.5 shrink-0"
            :class="n.read ? 'text-muted' : 'text-primary'"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate" :class="{ 'text-muted': n.read }">
              {{ n.title }}
            </p>
            <p class="text-xs text-muted truncate">{{ n.body }}</p>
            <p class="text-xs text-muted/60 mt-0.5">{{ formatTime(n.createdAt) }}</p>
          </div>
          <span v-if="!n.read" class="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
        </button>
      </div>

      <div class="border-t border-default px-4 py-2">
        <NuxtLink
          to="/dashboard"
          class="text-xs text-primary hover:underline"
          @click="open = false"
        >
          View activity dashboard →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
