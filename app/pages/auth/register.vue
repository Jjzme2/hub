<script setup lang="ts">
definePageMeta({ ssr: false })
useSeoMeta({ title: 'Create Account — ILYTAT Suite' })

const route = useRoute()
const router = useRouter()
const { registerWithEmail } = useAuth()

const token = computed(() => route.query.token as string | undefined)

const form = reactive({
  email: '',
  displayName: '',
  username: '',
  birthday: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')

async function handleRegister() {
  error.value = ''

  if (!form.displayName.trim()) {
    error.value = 'Display name is required'
    return
  }
  if (!form.username.trim()) {
    error.value = 'Username is required'
    return
  }
  if (!/^[a-z0-9_]{3,20}$/.test(form.username.toLowerCase())) {
    error.value = 'Username must be 3–20 characters: letters, numbers, or underscores only'
    return
  }
  if (!form.birthday) {
    error.value = 'Birthday is required'
    return
  }
  if (form.password.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true
  try {
    await registerWithEmail(
      form.email,
      form.password,
      { displayName: form.displayName, username: form.username, birthday: form.birthday },
      token.value
    )
    await router.push('/')
  } catch (e: any) {
    error.value = e.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="py-16 max-w-sm mx-auto">
    <div class="flex flex-col items-center gap-4 text-center mb-8">
      <div class="p-4 rounded-2xl bg-elevated ring ring-default">
        <UIcon name="i-lucide-user-plus" class="size-8 text-primary" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">Create Account</h1>
        <p class="text-muted mt-1 text-sm">
          {{ token ? "You've been invited to join ILYTAT Suite." : 'Register with your admin email.' }}
        </p>
      </div>
    </div>

    <div class="space-y-4">
      <UAlert v-if="error" color="error" variant="subtle" :description="error" />

      <UFormField label="Email" required>
        <UInput
          v-model="form.email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
        />
      </UFormField>

      <UFormField label="Display Name" required>
        <UInput
          v-model="form.displayName"
          placeholder="Jane Smith"
          autocomplete="name"
        />
      </UFormField>

      <UFormField label="Username" required>
        <UInput
          v-model="form.username"
          placeholder="janesmith"
          autocomplete="username"
        >
          <template #leading>
            <span class="text-muted text-sm">@</span>
          </template>
        </UInput>
      </UFormField>

      <UFormField label="Birthday" required>
        <UInput
          v-model="form.birthday"
          type="date"
        />
      </UFormField>

      <UFormField label="Password" required>
        <UInput
          v-model="form.password"
          type="password"
          placeholder="At least 8 characters"
          autocomplete="new-password"
        />
      </UFormField>

      <UFormField label="Confirm Password" required>
        <UInput
          v-model="form.confirmPassword"
          type="password"
          placeholder="Repeat password"
          autocomplete="new-password"
          @keyup.enter="handleRegister"
        />
      </UFormField>

      <UButton
        label="Create Account"
        block
        :loading="loading"
        :disabled="!form.email || !form.password || !form.confirmPassword"
        @click="handleRegister"
      />

      <p class="text-center text-xs text-muted pt-2">
        Already have an account?
        <NuxtLink to="/auth/login" class="text-primary hover:underline">Sign in</NuxtLink>
      </p>
    </div>
  </UContainer>
</template>
