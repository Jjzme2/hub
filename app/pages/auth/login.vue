<script setup lang="ts">
import * as Sentry from '@sentry/nuxt'

definePageMeta({ ssr: false })
useSeoMeta({ title: 'Sign In', robots: 'noindex' })

const { loginWithEmail, loginWithGoogle } = useAuth()
const router = useRouter()
const route = useRoute()

// Must be called at top level — not inside functions or lifecycle hooks
const auth = useFirebaseAuth()!

const form = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

function getCallback(): string | null {
  const raw = route.query.callback as string | undefined
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol === 'http:' || url.protocol === 'https:') return raw
  } catch {}
  return null
}

function getRedirect(): string | null {
  const raw = route.query.redirect as string | undefined
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol === 'http:' || url.protocol === 'https:') return raw
  } catch {
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  }
  return null
}

async function navigateAfterLogin() {
  const user = auth.currentUser
  if (!user) return

  let callback = getCallback()
  const redirect = getRedirect()

  // If no explicit callback but redirect is cross-origin, derive /auth/callback
  if (!callback && redirect) {
    try {
      const redirectUrl = new URL(redirect)
      if (redirectUrl.origin !== window.location.origin) {
        callback = `${redirectUrl.origin}/auth/callback`
      }
    } catch {}
  }

  if (callback) {
    Sentry.addBreadcrumb({ category: 'auth', message: 'Starting cross-app SSO token exchange', data: { callback }, level: 'info' })
    try {
      const idToken = await user.getIdToken()
      const params = new URLSearchParams({ callback })
      const { token } = await $fetch<{ token: string }>(`/api/auth/cross-token?${params}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      })
      const dest = new URL(callback)
      dest.searchParams.set('token', token)
      if (redirect) {
        try {
          dest.searchParams.set('redirect', new URL(redirect).pathname || '/')
        } catch {
          dest.searchParams.set('redirect', redirect)
        }
      }
      Sentry.addBreadcrumb({ category: 'auth', message: 'SSO token exchange succeeded, redirecting', data: { dest: dest.origin }, level: 'info' })
      window.location.href = dest.toString()
      return
    } catch (e) {
      Sentry.captureException(e, { extra: { callback, uid: user.uid, flow: 'cross-app-sso' } })
      console.error('Cross-app token exchange failed', e)
    }
  }

  if (redirect) {
    window.location.href = redirect
  } else {
    router.push('/admin')
  }
}

onMounted(async () => {
  await auth.authStateReady()
  if (auth.currentUser) {
    Sentry.addBreadcrumb({ category: 'auth', message: 'User already signed in on mount, proceeding', level: 'info' })
    await navigateAfterLogin()
  }
})

async function handleEmailLogin() {
  error.value = ''
  loading.value = true
  try {
    await loginWithEmail(form.email, form.password)
    Sentry.addBreadcrumb({ category: 'auth', message: 'Email login succeeded', level: 'info' })
    await navigateAfterLogin()
  } catch (e: any) {
    Sentry.captureException(e, { extra: { flow: 'email-login', code: e.code } })
    error.value = friendlyError(e.code)
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin() {
  error.value = ''
  loading.value = true
  try {
    await loginWithGoogle()
    Sentry.addBreadcrumb({ category: 'auth', message: 'Google login succeeded', level: 'info' })
    await navigateAfterLogin()
  } catch (e: any) {
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      Sentry.captureException(e, { extra: { flow: 'google-login', code: e.code } })
    }
    error.value = e.message || 'Google sign-in failed'
  } finally {
    loading.value = false
  }
}

function friendlyError(code: string) {
  const map: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many attempts — try again later',
    'auth/user-disabled': 'This account has been disabled'
  }
  return map[code] || 'Sign in failed. Please try again.'
}
</script>

<template>
  <UContainer class="py-24 max-w-sm mx-auto">
    <div class="flex flex-col items-center gap-4 text-center mb-8">
      <div class="p-4 rounded-2xl bg-elevated ring ring-default">
        <UIcon name="i-lucide-lock" class="size-8 text-primary" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">Sign In</h1>
        <p class="text-muted mt-1 text-sm">Access the ILYTAT Suite admin panel.</p>
      </div>
    </div>

    <div class="space-y-4">
      <UAlert v-if="error" color="error" variant="subtle" :description="error" />

      <UFormField label="Email">
        <UInput
          v-model="form.email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          @keyup.enter="handleEmailLogin"
        />
      </UFormField>

      <UFormField label="Password">
        <UInput
          v-model="form.password"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          @keyup.enter="handleEmailLogin"
        />
      </UFormField>

      <UButton
        label="Sign In"
        block
        :loading="loading"
        :disabled="!form.email || !form.password"
        @click="handleEmailLogin"
      />

      <div class="relative flex items-center gap-3 py-1">
        <div class="flex-1 border-t border-default" />
        <span class="text-xs text-muted">or</span>
        <div class="flex-1 border-t border-default" />
      </div>

      <UButton
        icon="i-simple-icons-google"
        label="Continue with Google"
        color="neutral"
        variant="outline"
        block
        :loading="loading"
        @click="handleGoogleLogin"
      />

      <p class="text-center text-xs text-muted pt-2">
        Have an invite?
        <NuxtLink to="/auth/register" class="text-primary hover:underline">Create an account</NuxtLink>
      </p>
    </div>
  </UContainer>
</template>
