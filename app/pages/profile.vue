<script setup lang="ts">
import { doc, getDoc } from 'firebase/firestore'

definePageMeta({ ssr: false, middleware: 'auth' })
useSeoMeta({ title: 'Profile' })

const db = useFirestore()
const store = useAuthStore()
const { updateUserProfile, changeEmail, changePassword, resendVerificationEmail, reloadUser } = useAuth()
const notify = useNotification()

const user = computed(() => store.currentUser)
const hasPasswordProvider = computed(() =>
  user.value?.providerData.some(p => p.providerId === 'password') ?? false
)

// ── Profile info ──────────────────────────────────────────────────────────────

const profile = reactive({ displayName: '', username: '', birthday: '' })
const profileLoading = ref(true)
const profileSaving = ref(false)
const profileValidationError = ref('')

async function loadProfile() {
  if (!user.value) return
  profileLoading.value = true
  const snap = await getDoc(doc(db, 'users', user.value.uid))
  if (snap.exists()) {
    const data = snap.data()
    profile.displayName = data.displayName || ''
    profile.username = data.username || ''
    profile.birthday = data.birthday || ''
  }
  profileLoading.value = false
}

async function saveProfile() {
  if (!user.value) return
  profileValidationError.value = ''
  if (!/^[a-z0-9_]{3,20}$/.test(profile.username.toLowerCase())) {
    profileValidationError.value = 'Username must be 3–20 characters: letters, numbers, or underscores only'
    return
  }
  profileSaving.value = true
  try {
    await updateUserProfile(user.value.uid, {
      displayName: profile.displayName,
      username: profile.username.toLowerCase().trim(),
      birthday: profile.birthday
    })
    notify.success('Profile saved')
  }
  catch (e) {
    notify.error('Failed to save profile', { error: e })
  }
  finally {
    profileSaving.value = false
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────

const emailForm = reactive({ currentPassword: '', newEmail: '' })
const emailSaving = ref(false)
const verifyLoading = ref(false)

async function handleChangeEmail() {
  emailSaving.value = true
  try {
    await changeEmail(emailForm.currentPassword, emailForm.newEmail)
    notify.info('Verification email sent', {
      description: `A link has been sent to ${emailForm.newEmail}. Click it to confirm the change.`
    })
    emailForm.currentPassword = ''
    emailForm.newEmail = ''
  }
  catch (e: any) {
    notify.error('Email update failed', {
      description: friendlyAuthError(e.code),
      error: e
    })
  }
  finally {
    emailSaving.value = false
  }
}

async function handleResendVerification() {
  verifyLoading.value = true
  try {
    await resendVerificationEmail()
    notify.success('Verification email sent')
  }
  catch (e) {
    notify.error('Could not send verification email', { error: e })
  }
  finally {
    verifyLoading.value = false
  }
}

async function handleReloadUser() {
  await reloadUser()
}

// ── Password ──────────────────────────────────────────────────────────────────

const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordSaving = ref(false)
const passwordValidationError = ref('')

async function handleChangePassword() {
  passwordValidationError.value = ''
  if (passwordForm.newPassword.length < 8) {
    passwordValidationError.value = 'Password must be at least 8 characters'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordValidationError.value = 'Passwords do not match'
    return
  }
  passwordSaving.value = true
  try {
    await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
    notify.success('Password updated')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  }
  catch (e: any) {
    notify.error('Password change failed', {
      description: friendlyAuthError(e.code),
      error: e
    })
  }
  finally {
    passwordSaving.value = false
  }
}

function friendlyAuthError(code: string) {
  const map: Record<string, string> = {
    'auth/wrong-password': 'Current password is incorrect',
    'auth/invalid-credential': 'Current password is incorrect',
    'auth/too-many-requests': 'Too many attempts — try again later',
    'auth/email-already-in-use': 'That email is already in use',
    'auth/invalid-email': 'Invalid email address',
    'auth/requires-recent-login': 'Please sign out and sign back in before making this change'
  }
  return map[code] || ''
}

onMounted(loadProfile)
</script>

<template>
  <UContainer class="py-12 max-w-lg mx-auto space-y-8">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Profile</h1>
      <p class="text-muted mt-1 text-sm">Manage your account details.</p>
    </div>

    <!-- Profile info -->
    <div class="p-6 rounded-2xl ring ring-default bg-elevated space-y-4">
      <h2 class="font-semibold">Personal Info</h2>

      <div v-if="profileLoading" class="space-y-3">
        <USkeleton class="h-8 rounded-lg" />
        <USkeleton class="h-8 rounded-lg" />
        <USkeleton class="h-8 rounded-lg" />
      </div>

      <template v-else>
        <UAlert v-if="profileValidationError" color="error" variant="subtle" :description="profileValidationError" />

        <UFormField label="Display Name">
          <UInput v-model="profile.displayName" placeholder="Jane Smith" />
        </UFormField>

        <UFormField label="Username">
          <UInput v-model="profile.username" placeholder="janesmith">
            <template #leading>
              <span class="text-muted text-sm">@</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField label="Birthday">
          <UInput v-model="profile.birthday" type="date" />
        </UFormField>

        <div class="flex justify-end">
          <UButton label="Save Changes" :loading="profileSaving" @click="saveProfile" />
        </div>
      </template>
    </div>

    <!-- Email -->
    <div class="p-6 rounded-2xl ring ring-default bg-elevated space-y-4">
      <h2 class="font-semibold">Email Address</h2>

      <div class="flex items-center gap-3">
        <p class="text-sm flex-1">{{ user?.email }}</p>
        <UBadge
          v-if="user?.emailVerified"
          label="Verified"
          color="success"
          variant="subtle"
          icon="i-lucide-check"
        />
        <template v-else>
          <UBadge label="Unverified" color="warning" variant="subtle" />
          <UButton
            label="Resend verification"
            icon="i-lucide-mail"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="verifyLoading"
            @click="handleResendVerification"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Refresh verification status"
            @click="handleReloadUser"
          />
        </template>
      </div>

      <template v-if="hasPasswordProvider">
        <div class="border-t border-default pt-4 space-y-3">
          <p class="text-sm text-muted">Update email address — a verification link will be sent to the new address.</p>

          <UFormField label="New Email">
            <UInput v-model="emailForm.newEmail" type="email" placeholder="new@example.com" />
          </UFormField>

          <UFormField label="Current Password">
            <UInput v-model="emailForm.currentPassword" type="password" placeholder="••••••••" />
          </UFormField>

          <div class="flex justify-end">
            <UButton
              label="Update Email"
              :loading="emailSaving"
              :disabled="!emailForm.newEmail || !emailForm.currentPassword"
              @click="handleChangeEmail"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Password -->
    <div v-if="hasPasswordProvider" class="p-6 rounded-2xl ring ring-default bg-elevated space-y-4">
      <h2 class="font-semibold">Change Password</h2>

      <UAlert v-if="passwordValidationError" color="error" variant="subtle" :description="passwordValidationError" />

      <UFormField label="Current Password">
        <UInput v-model="passwordForm.currentPassword" type="password" placeholder="••••••••" autocomplete="current-password" />
      </UFormField>

      <UFormField label="New Password">
        <UInput v-model="passwordForm.newPassword" type="password" placeholder="At least 8 characters" autocomplete="new-password" />
      </UFormField>

      <UFormField label="Confirm New Password">
        <UInput
          v-model="passwordForm.confirmPassword"
          type="password"
          placeholder="Repeat new password"
          autocomplete="new-password"
          @keyup.enter="handleChangePassword"
        />
      </UFormField>

      <div class="flex justify-end">
        <UButton
          label="Update Password"
          :loading="passwordSaving"
          :disabled="!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword"
          @click="handleChangePassword"
        />
      </div>
    </div>

    <!-- Notification preferences -->
    <div class="p-6 rounded-2xl ring ring-default bg-elevated space-y-4">
      <h2 class="font-semibold">Notifications</h2>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">Sound effects</p>
          <p class="text-xs text-muted mt-0.5">Play a tone when notifications appear</p>
        </div>
        <UToggle :model-value="notify.soundEnabled" @update:model-value="notify.setSoundEnabled" />
      </div>
    </div>
  </UContainer>
</template>
