<script setup lang="ts">
import { doc, getDoc } from 'firebase/firestore'
import QRCode from 'qrcode'

definePageMeta({ ssr: false, middleware: 'auth' })
useSeoMeta({ title: 'Profile' })

const db = useFirestore()
const store = useAuthStore()
const { updateUserProfile, changeEmail, changePassword, resendVerificationEmail, reloadUser, isTotpEnabled, setupTotp, enrollTotp, disableTotp } = useAuth()
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

// ── 2FA ───────────────────────────────────────────────────────────────────────

const totpEnabled = ref(false)
const enrolling = ref(false)
const enrollLoading = ref(false)
const disableLoading = ref(false)
const pendingSecret = ref('')
const qrDataUrl = ref('')
const enrollCode = ref('')
const enrollError = ref('')

async function refreshTotpStatus() {
  totpEnabled.value = await isTotpEnabled()
}

async function handleStartEnrollment() {
  enrollLoading.value = true
  enrollError.value = ''
  try {
    const { secret, otpauthUri } = await setupTotp()
    pendingSecret.value = secret
    qrDataUrl.value = await QRCode.toDataURL(otpauthUri, { width: 200, margin: 1 })
    enrolling.value = true
  } catch (e: any) {
    notify.error('Could not start 2FA setup', { error: e })
  } finally {
    enrollLoading.value = false
  }
}

async function handleFinalizeEnrollment() {
  if (!pendingSecret.value) return
  enrollLoading.value = true
  enrollError.value = ''
  try {
    await enrollTotp(pendingSecret.value, enrollCode.value)
    notify.success('Two-factor authentication enabled')
    enrolling.value = false
    pendingSecret.value = ''
    qrDataUrl.value = ''
    enrollCode.value = ''
    await refreshTotpStatus()
  } catch {
    enrollError.value = 'Invalid code — check your authenticator app and try again.'
  } finally {
    enrollLoading.value = false
  }
}

async function handleDisable2FA() {
  disableLoading.value = true
  try {
    await disableTotp()
    notify.success('Two-factor authentication disabled')
    await refreshTotpStatus()
  } catch (e: any) {
    notify.error('Could not disable 2FA', { error: e })
  } finally {
    disableLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
  refreshTotpStatus()
})
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

    <!-- Two-Factor Authentication -->
    <div class="p-6 rounded-2xl ring ring-default bg-elevated space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-semibold">Two-Factor Authentication</h2>
          <p class="text-xs text-muted mt-0.5">Protect your account with an authenticator app (TOTP).</p>
        </div>
        <UBadge
          v-if="totpEnabled"
          label="Enabled"
          color="success"
          variant="subtle"
          icon="i-lucide-shield-check"
        />
        <UBadge
          v-else
          label="Disabled"
          color="neutral"
          variant="subtle"
        />
      </div>

      <!-- Enabled state -->
      <template v-if="totpEnabled && !enrolling">
        <p class="text-sm text-muted">Your account is protected with a TOTP authenticator app.</p>
        <UButton
          label="Disable 2FA"
          color="error"
          variant="subtle"
          icon="i-lucide-shield-off"
          :loading="disableLoading"
          @click="handleDisable2FA"
        />
      </template>

      <!-- Enrollment: scan QR -->
      <template v-else-if="enrolling">
        <p class="text-sm text-muted">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code to confirm.
        </p>
        <div class="flex justify-center">
          <img :src="qrDataUrl" alt="2FA QR code" class="rounded-lg size-48 dark:invert" />
        </div>

        <UAlert v-if="enrollError" color="error" variant="subtle" :description="enrollError" />

        <UFormField label="Verification Code">
          <UInput
            v-model="enrollCode"
            type="text"
            inputmode="numeric"
            placeholder="000 000"
            autocomplete="one-time-code"
            class="font-mono tracking-widest text-center"
            @keyup.enter="handleFinalizeEnrollment"
          />
        </UFormField>

        <div class="flex gap-2">
          <UButton
            label="Confirm & Enable"
            :loading="enrollLoading"
            :disabled="enrollCode.replace(/\s/g, '').length < 6"
            @click="handleFinalizeEnrollment"
          />
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="enrolling = false; totpSecret = null; qrDataUrl = ''; enrollCode = ''; enrollError = ''"
          />
        </div>
      </template>

      <!-- Disabled state -->
      <template v-else>
        <p class="text-sm text-muted">Add an extra layer of security — you'll be asked for a code from your authenticator app on every sign-in.</p>
        <UButton
          label="Set up 2FA"
          icon="i-lucide-shield-plus"
          :loading="enrollLoading"
          @click="handleStartEnrollment"
        />
      </template>
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
