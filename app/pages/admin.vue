<script setup lang="ts">
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import type { SuiteApp, UserProfile } from '~/types/suite'
import dayjs from 'dayjs'

definePageMeta({ ssr: false, middleware: 'admin' })
useSeoMeta({ title: 'Admin' })

const db = useFirestore()
const { logout } = useAuth()
const router = useRouter()

const tabs = [
  { label: 'Apps', icon: 'i-lucide-layout-grid', slot: 'apps' },
  { label: 'Invites', icon: 'i-lucide-mail-plus', slot: 'invites' },
  { label: 'Users', icon: 'i-lucide-users', slot: 'users' },
  { label: 'Logs', icon: 'i-lucide-scroll-text', slot: 'logs' }
]

async function signOut() {
  await logout()
  await router.push('/auth/login')
}

// ── Apps ──────────────────────────────────────────────────────────────────────

const apps = ref<SuiteApp[]>([])
const appsLoading = ref(true)
const appModalOpen = ref(false)
const editingApp = ref<SuiteApp | null>(null)
const saving = ref(false)
const deleting = ref<string | null>(null)

const defaultForm = () => ({
  name: '',
  description: '',
  url: '',
  icon: 'i-lucide-box',
  color: 'violet',
  order: 0,
  enabled: true
})

const appForm = reactive(defaultForm())

function openAddModal() {
  editingApp.value = null
  Object.assign(appForm, defaultForm(), { order: apps.value.length })
  appModalOpen.value = true
}

function openEditModal(app: SuiteApp) {
  editingApp.value = app
  Object.assign(appForm, {
    name: app.name,
    description: app.description,
    url: app.url,
    icon: app.icon,
    color: app.color || 'violet',
    order: app.order ?? 0,
    enabled: app.enabled
  })
  appModalOpen.value = true
}

async function saveApp() {
  if (!appForm.name || !appForm.url) return
  saving.value = true
  try {
    const data = {
      name: appForm.name,
      description: appForm.description,
      url: appForm.url,
      icon: appForm.icon,
      color: appForm.color,
      order: Number(appForm.order),
      enabled: appForm.enabled,
      updatedAt: serverTimestamp()
    }
    if (editingApp.value) {
      await updateDoc(doc(db, 'apps', editingApp.value.id), data)
    } else {
      await addDoc(collection(db, 'apps'), { ...data, createdAt: serverTimestamp() })
    }
    appModalOpen.value = false
  } finally {
    saving.value = false
  }
}

async function deleteApp(id: string) {
  deleting.value = id
  try {
    await deleteDoc(doc(db, 'apps', id))
  } finally {
    deleting.value = null
  }
}

onMounted(() => {
  const q = query(collection(db, 'apps'), orderBy('order', 'asc'))
  const unsub = onSnapshot(
    q,
    snap => {
      apps.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as SuiteApp))
      appsLoading.value = false
    },
    () => { appsLoading.value = false }
  )
  onUnmounted(unsub)
})

// ── Invites ───────────────────────────────────────────────────────────────────

interface Invite {
  id: string
  email: string
  invitedBy: string
  createdAt: any
  usedAt?: any
  usedByUid?: string
}

const invites = ref<Invite[]>([])
const invitesLoading = ref(true)
const inviteEmail = ref('')
const creatingInvite = ref(false)
const newInviteLink = ref('')
const newInviteCopied = ref(false)
const copiedInviteId = ref<string | null>(null)

const qrModalOpen = ref(false)
const qrModalLink = ref('')
const qrModalEmail = ref('')

async function loadInvites() {
  invitesLoading.value = true
  const snap = await getDocs(query(collection(db, 'invites'), orderBy('createdAt', 'desc')))
  invites.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite))
  invitesLoading.value = false
}

async function createInvite() {
  if (!inviteEmail.value) return
  creatingInvite.value = true
  newInviteLink.value = ''
  try {
    const token = crypto.randomUUID()
    await setDoc(doc(db, 'invites', token), {
      email: inviteEmail.value.toLowerCase().trim(),
      invitedBy: useCurrentUser().value?.uid ?? '',
      createdAt: serverTimestamp()
    })
    newInviteLink.value = `${window.location.origin}/auth/register?token=${token}`
    inviteEmail.value = ''
    await loadInvites()
  } finally {
    creatingInvite.value = false
  }
}

function inviteLink(invite: Invite) {
  return `${window.location.origin}/auth/register?token=${invite.id}`
}

async function copyLink(link: string, id?: string) {
  await navigator.clipboard.writeText(link)
  if (id) {
    copiedInviteId.value = id
    setTimeout(() => { copiedInviteId.value = null }, 2000)
  } else {
    newInviteCopied.value = true
    setTimeout(() => { newInviteCopied.value = false }, 2000)
  }
}

function showQr(invite: Invite) {
  qrModalLink.value = inviteLink(invite)
  qrModalEmail.value = invite.email
  qrModalOpen.value = true
}

onMounted(loadInvites)

// ── Users ─────────────────────────────────────────────────────────────────────

const users = ref<UserProfile[]>([])
const usersLoading = ref(true)

const userEditModalOpen = ref(false)
const editingUser = ref<UserProfile | null>(null)
const userEditForm = reactive({ isAdmin: false, isDisabled: false })
const savingUser = ref(false)
const deletingUser = ref<string | null>(null)

async function loadUsers() {
  usersLoading.value = true
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'asc')))
  users.value = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))
  usersLoading.value = false
}

function openUserEdit(user: UserProfile) {
  editingUser.value = user
  userEditForm.isAdmin = user.isAdmin
  userEditForm.isDisabled = user.isDisabled ?? false
  userEditModalOpen.value = true
}

async function saveUser() {
  if (!editingUser.value) return
  savingUser.value = true
  try {
    await updateDoc(doc(db, 'users', editingUser.value.uid), {
      isAdmin: userEditForm.isAdmin,
      isDisabled: userEditForm.isDisabled,
      updatedAt: serverTimestamp()
    })
    const idx = users.value.findIndex(u => u.uid === editingUser.value!.uid)
    if (idx !== -1) {
      users.value[idx] = { ...users.value[idx], isAdmin: userEditForm.isAdmin, isDisabled: userEditForm.isDisabled }
    }
    userEditModalOpen.value = false
  } finally {
    savingUser.value = false
  }
}

async function deleteUser(uid: string) {
  deletingUser.value = uid
  try {
    await deleteDoc(doc(db, 'users', uid))
    users.value = users.value.filter(u => u.uid !== uid)
  } finally {
    deletingUser.value = null
  }
}

onMounted(loadUsers)

// ── Logs ──────────────────────────────────────────────────────────────────────

interface HubLog {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  context?: Record<string, unknown>
  errorMessage?: string
  errorStack?: string
  createdAt: any
}

const logs = ref<HubLog[]>([])
const logsLoading = ref(true)
const logLevelFilter = ref<'all' | 'info' | 'warn' | 'error'>('all')
const expandedLogId = ref<string | null>(null)

const levelColors = { all: 'neutral', info: 'sky', warn: 'amber', error: 'red' } as const

const filteredLogs = computed(() =>
  logLevelFilter.value === 'all'
    ? logs.value
    : logs.value.filter(l => l.level === logLevelFilter.value)
)

function formatLogTime(ts: any): string {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return dayjs(d).format('MMM D, HH:mm:ss')
}

onMounted(() => {
  const q = query(collection(db, 'hub_logs'), orderBy('createdAt', 'desc'), limit(200))
  const unsub = onSnapshot(
    q,
    snap => {
      logs.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as HubLog))
      logsLoading.value = false
    },
    () => { logsLoading.value = false }
  )
  onUnmounted(unsub)
})
</script>

<template>
  <UContainer class="py-12">
    <div class="flex items-center justify-between mb-8 gap-4 flex-wrap">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Admin</h1>
        <p class="text-muted mt-1 text-sm">Manage apps, invites, and users.</p>
      </div>
      <UButton icon="i-lucide-log-out" label="Sign Out" color="neutral" variant="ghost" @click="signOut" />
    </div>

    <UTabs :items="tabs" variant="link">

      <!-- ── Apps ─────────────────────────────────────────────────────────── -->
      <template #apps>
        <div class="pt-4">
          <div class="flex justify-end mb-4">
            <UButton icon="i-lucide-plus" label="Add App" @click="openAddModal" />
          </div>

          <div v-if="appsLoading" class="space-y-2">
            <USkeleton v-for="i in 3" :key="i" class="h-16 rounded-xl" />
          </div>

          <div v-else-if="!apps.length" class="flex flex-col items-center justify-center py-20 gap-3 text-muted">
            <UIcon name="i-lucide-layout-grid" class="size-10 opacity-25" />
            <p class="text-sm">No apps yet. Add your first one.</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="app in apps"
              :key="app.id"
              class="flex items-center gap-4 px-4 py-3 rounded-xl ring ring-default bg-elevated"
            >
              <div class="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <UIcon :name="app.icon || 'i-lucide-box'" class="size-4 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm truncate">{{ app.name }}</span>
                  <UBadge v-if="!app.enabled" label="Disabled" color="neutral" variant="subtle" size="xs" />
                </div>
                <p class="text-xs text-muted truncate">{{ app.url }}</p>
              </div>
              <span class="text-xs text-muted shrink-0 hidden sm:block">order: {{ app.order }}</span>
              <div class="flex items-center gap-1 shrink-0">
                <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs" aria-label="Edit" @click="openEditModal(app)" />
                <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" aria-label="Delete" :loading="deleting === app.id" @click="deleteApp(app.id)" />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Invites ──────────────────────────────────────────────────────── -->
      <template #invites>
        <div class="pt-4 space-y-6">

          <!-- Create invite card -->
          <div class="p-5 rounded-xl ring ring-default bg-elevated space-y-4">
            <h2 class="font-medium text-sm">Invite someone</h2>
            <div class="flex gap-2">
              <UInput
                v-model="inviteEmail"
                type="email"
                placeholder="colleague@example.com"
                class="flex-1"
                @keyup.enter="createInvite"
              />
              <UButton
                icon="i-lucide-send"
                label="Generate"
                :loading="creatingInvite"
                :disabled="!inviteEmail"
                @click="createInvite"
              />
            </div>

            <!-- New invite result: link + QR -->
            <div v-if="newInviteLink" class="space-y-4 pt-1">
              <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 ring ring-primary/20">
                <p class="text-xs text-muted truncate flex-1 font-mono">{{ newInviteLink }}</p>
                <UButton
                  :icon="newInviteCopied ? 'i-lucide-check' : 'i-lucide-copy'"
                  :color="newInviteCopied ? 'success' : 'neutral'"
                  variant="ghost"
                  size="xs"
                  aria-label="Copy link"
                  @click="copyLink(newInviteLink)"
                />
              </div>
              <div class="flex justify-center">
                <div class="p-3 rounded-xl ring ring-default bg-white">
                  <QrCode :value="newInviteLink" :size="180" />
                </div>
              </div>
            </div>
          </div>

          <!-- Invite list -->
          <div v-if="invitesLoading" class="space-y-2">
            <USkeleton v-for="i in 3" :key="i" class="h-12 rounded-xl" />
          </div>

          <div v-else-if="!invites.length" class="flex flex-col items-center justify-center py-12 gap-3 text-muted">
            <UIcon name="i-lucide-mail" class="size-10 opacity-25" />
            <p class="text-sm">No invites yet.</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="invite in invites"
              :key="invite.id"
              class="flex items-center gap-3 px-4 py-3 rounded-xl ring ring-default bg-elevated"
            >
              <UIcon name="i-lucide-mail" class="size-4 text-muted shrink-0" />
              <p class="text-sm font-medium flex-1 truncate">{{ invite.email }}</p>

              <UBadge
                :label="invite.usedAt ? 'Accepted' : 'Pending'"
                :color="invite.usedAt ? 'success' : 'warning'"
                variant="subtle"
                size="xs"
              />

              <template v-if="!invite.usedAt">
                <UButton
                  :icon="copiedInviteId === invite.id ? 'i-lucide-check' : 'i-lucide-copy'"
                  :color="copiedInviteId === invite.id ? 'success' : 'neutral'"
                  variant="ghost"
                  size="xs"
                  aria-label="Copy link"
                  @click="copyLink(inviteLink(invite), invite.id)"
                />
                <UButton
                  icon="i-lucide-qr-code"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Show QR code"
                  @click="showQr(invite)"
                />
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Users ────────────────────────────────────────────────────────── -->
      <template #users>
        <div class="pt-4">
          <div class="flex justify-end mb-4">
            <UButton icon="i-lucide-refresh-cw" label="Refresh" color="neutral" variant="ghost" size="sm" :loading="usersLoading" @click="loadUsers" />
          </div>

          <div v-if="usersLoading" class="space-y-2">
            <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-xl" />
          </div>

          <div v-else-if="!users.length" class="flex flex-col items-center justify-center py-20 gap-3 text-muted">
            <UIcon name="i-lucide-users" class="size-10 opacity-25" />
            <p class="text-sm">No users found.</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="user in users"
              :key="user.uid"
              class="flex items-center gap-4 px-4 py-3 rounded-xl ring ring-default bg-elevated"
              :class="user.isDisabled ? 'opacity-50' : ''"
            >
              <div class="p-1.5 rounded-full bg-primary/10 shrink-0">
                <UIcon name="i-lucide-user" class="size-4 text-primary" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-medium text-sm">{{ user.displayName || user.email }}</span>
                  <span v-if="user.username" class="text-xs text-muted">@{{ user.username }}</span>
                  <UBadge v-if="user.isAdmin" label="Admin" color="primary" variant="subtle" size="xs" />
                  <UBadge v-if="user.isDisabled" label="Disabled" color="error" variant="subtle" size="xs" />
                </div>
                <p class="text-xs text-muted truncate">{{ user.email }}</p>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Edit user"
                  @click="openUserEdit(user)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  aria-label="Delete user"
                  :loading="deletingUser === user.uid"
                  @click="deleteUser(user.uid)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
      <!-- ── Logs ────────────────────────────────────────────────────────── -->
      <template #logs>
        <div class="pt-4 space-y-3">

          <!-- Filter bar -->
          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex gap-1">
              <UButton
                v-for="lvl in (['all', 'info', 'warn', 'error'] as const)"
                :key="lvl"
                :label="lvl === 'all' ? 'All' : lvl.charAt(0).toUpperCase() + lvl.slice(1)"
                size="xs"
                :variant="logLevelFilter === lvl ? 'solid' : 'ghost'"
                :color="levelColors[lvl]"
                @click="logLevelFilter = lvl"
              />
            </div>
            <span class="text-xs text-muted ml-auto">
              {{ filteredLogs.length }}{{ logLevelFilter !== 'all' ? ` of ${logs.length}` : '' }} entries
            </span>
          </div>

          <!-- Loading skeletons -->
          <div v-if="logsLoading" class="space-y-2">
            <USkeleton v-for="i in 5" :key="i" class="h-10 rounded-xl" />
          </div>

          <!-- Empty state -->
          <div v-else-if="!filteredLogs.length" class="flex flex-col items-center justify-center py-20 gap-3 text-muted">
            <UIcon name="i-lucide-scroll-text" class="size-10 opacity-25" />
            <p class="text-sm">No logs found.</p>
          </div>

          <!-- Log entries -->
          <div v-else class="space-y-1">
            <div
              v-for="log in filteredLogs"
              :key="log.id"
              class="rounded-xl ring ring-default bg-elevated overflow-hidden"
            >
              <button
                type="button"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
                @click="expandedLogId = expandedLogId === log.id ? null : log.id"
              >
                <UBadge
                  :label="log.level.toUpperCase()"
                  :color="levelColors[log.level]"
                  variant="subtle"
                  size="xs"
                  class="shrink-0 font-mono w-12 justify-center"
                />
                <span class="text-xs text-muted shrink-0 font-mono tabular-nums">
                  {{ formatLogTime(log.createdAt) }}
                </span>
                <span class="text-sm flex-1 truncate">{{ log.message }}</span>
                <UIcon
                  :name="expandedLogId === log.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="size-3.5 text-muted shrink-0"
                />
              </button>

              <div v-if="expandedLogId === log.id" class="px-4 pt-2 pb-3 space-y-2 border-t border-default">
                <pre
                  v-if="log.context"
                  class="text-xs font-mono bg-muted/30 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap"
                >{{ JSON.stringify(log.context, null, 2) }}</pre>
                <div v-if="log.errorMessage" class="space-y-1">
                  <p class="text-xs font-semibold text-red-500 dark:text-red-400">{{ log.errorMessage }}</p>
                  <pre
                    v-if="log.errorStack"
                    class="text-xs font-mono text-muted bg-muted/30 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap"
                  >{{ log.errorStack }}</pre>
                </div>
                <p v-if="!log.context && !log.errorMessage" class="text-xs text-muted italic">
                  No additional context.
                </p>
              </div>
            </div>
          </div>

        </div>
      </template>

    </UTabs>

    <!-- ── App modal ─────────────────────────────────────────────────────── -->
    <UModal v-model:open="appModalOpen" :title="editingApp ? 'Edit App' : 'Add App'">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name" required>
            <UInput v-model="appForm.name" placeholder="Projects" autofocus />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="appForm.description" placeholder="Track and manage your projects." :rows="2" resize />
          </UFormField>
          <UFormField label="URL" required>
            <UInput v-model="appForm.url" type="url" placeholder="https://projects.example.com" />
          </UFormField>
          <UFormField label="Icon">
            <div class="flex items-center gap-2">
              <UInput v-model="appForm.icon" placeholder="i-lucide-box" class="flex-1" />
              <div class="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <UIcon :name="appForm.icon || 'i-lucide-box'" class="size-5 text-primary" />
              </div>
            </div>
            <template #hint>
              Lucide icon name — e.g. <code class="text-xs">i-lucide-folder-kanban</code>
            </template>
          </UFormField>
          <UFormField label="Order">
            <UInput v-model.number="appForm.order" type="number" :min="0" placeholder="0" />
          </UFormField>
          <UFormField label="Enabled">
            <USwitch v-model="appForm.enabled" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="appModalOpen = false" />
          <UButton :label="editingApp ? 'Save Changes' : 'Add App'" :loading="saving" :disabled="!appForm.name || !appForm.url" @click="saveApp" />
        </div>
      </template>
    </UModal>

    <!-- ── QR modal ──────────────────────────────────────────────────────── -->
    <UModal v-model:open="qrModalOpen" :title="`Invite — ${qrModalEmail}`">
      <template #body>
        <div class="space-y-5">
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated ring ring-default">
            <p class="text-xs text-muted truncate flex-1 font-mono">{{ qrModalLink }}</p>
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Copy link"
              @click="copyLink(qrModalLink)"
            />
          </div>
          <div class="flex justify-center">
            <div class="p-4 rounded-2xl bg-white ring ring-default">
              <QrCode :value="qrModalLink" :size="220" />
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton label="Close" color="neutral" variant="ghost" @click="qrModalOpen = false" />
        </div>
      </template>
    </UModal>

    <!-- ── User edit modal ───────────────────────────────────────────────── -->
    <UModal v-model:open="userEditModalOpen" :title="editingUser?.displayName || editingUser?.email || 'Edit User'">
      <template #body>
        <div class="space-y-5">
          <div class="space-y-1">
            <p class="text-sm font-medium">{{ editingUser?.email }}</p>
            <p v-if="editingUser?.username" class="text-xs text-muted">@{{ editingUser.username }}</p>
          </div>

          <UFormField label="Admin access">
            <div class="flex items-center gap-3">
              <USwitch v-model="userEditForm.isAdmin" />
              <span class="text-sm text-muted">Can manage apps, invites, and users</span>
            </div>
          </UFormField>

          <UFormField label="Account disabled">
            <div class="flex items-center gap-3">
              <USwitch v-model="userEditForm.isDisabled" />
              <span class="text-sm text-muted">Prevent this user from signing in</span>
            </div>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="userEditModalOpen = false" />
          <UButton label="Save" :loading="savingUser" @click="saveUser" />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
