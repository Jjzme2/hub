<script setup lang="ts">
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import type { SuiteApp } from '~/types/suite'

useSeoMeta({ title: 'ILYTAT Suite' })

const db = useFirestore()
const apps = ref<SuiteApp[]>([])
const loading = ref(true)

onMounted(() => {
  const q = query(collection(db, 'apps'), orderBy('order', 'asc'))
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      apps.value = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as SuiteApp))
        .filter(a => a.enabled)
      loading.value = false
    },
    () => { loading.value = false }
  )
  onUnmounted(unsubscribe)
})
</script>

<template>
  <UContainer class="py-12">
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight">Your Suite</h1>
      <p class="text-muted mt-1">Launch any of your apps below.</p>
    </div>

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-44 rounded-xl" />
    </div>

    <div v-else-if="!apps.length" class="flex flex-col items-center justify-center py-24 gap-3 text-muted">
      <UIcon name="i-lucide-layout-grid" class="size-12 opacity-25" />
      <p class="text-sm">No apps configured yet.</p>
      <UButton to="/admin" variant="soft" size="sm" label="Go to Admin" />
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard v-for="app in apps" :key="app.id" :app="app" />
    </div>
  </UContainer>
</template>
