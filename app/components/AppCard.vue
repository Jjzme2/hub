<script setup lang="ts">
import type { SuiteApp } from '~/types/suite'

defineProps<{ app: SuiteApp }>()
</script>

<template>
  <UCard class="flex flex-col gap-4 hover:ring-primary/50 transition-all duration-150">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-primary/10 shrink-0">
          <UIcon :name="app.icon || 'i-lucide-box'" class="size-5 text-primary" />
        </div>
        <h3 class="font-semibold text-base truncate">{{ app.name }}</h3>
      </div>
    </template>

    <p class="text-sm text-muted line-clamp-2 min-h-[2.5rem]">
      {{ app.description || 'No description.' }}
    </p>

    <template #footer>
      <UButton
        :to="app.url"
        target="_blank"
        rel="noopener noreferrer"
        label="Launch"
        trailing-icon="i-lucide-arrow-up-right"
        color="primary"
        variant="soft"
        size="sm"
        block
      />
    </template>
  </UCard>
</template>
