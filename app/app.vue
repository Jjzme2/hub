<script setup lang="ts">
const store = useAuthStore()
const { logout } = useAuth()
const router = useRouter()

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'en' }
})

useSeoMeta({
  title: 'ILYTAT Suite',
  description: 'Your personal productivity suite — all your apps in one place.'
})

async function signOut() {
  await logout()
  await router.push('/auth/login')
}
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <UIcon name="i-lucide-layout-grid" class="size-6 text-primary" />
          <span class="font-semibold tracking-tight text-lg">ILYTAT Suite</span>
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />

        <template v-if="store.currentUser">
          <UButton
            v-if="store.isAdmin"
            to="/admin"
            icon="i-lucide-settings"
            label="Admin"
            color="neutral"
            variant="ghost"
          />
          <UButton
            to="/profile"
            icon="i-lucide-user"
            color="neutral"
            variant="ghost"
            aria-label="Profile"
          />
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            aria-label="Sign out"
            @click="signOut"
          />
        </template>

        <UButton
          v-else
          to="/auth/login"
          icon="i-lucide-lock"
          color="neutral"
          variant="ghost"
          aria-label="Sign in"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          ILYTAT Suite &copy; {{ new Date().getFullYear() }}
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
