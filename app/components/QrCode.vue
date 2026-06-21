<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{
  value: string
  size?: number
}>()

const dataUrl = ref('')

watchEffect(async () => {
  if (!props.value) return
  dataUrl.value = await QRCode.toDataURL(props.value, {
    width: props.size ?? 200,
    margin: 2,
    color: { dark: '#09090b', light: '#ffffff' }
  })
})
</script>

<template>
  <img
    v-if="dataUrl"
    :src="dataUrl"
    :width="size ?? 200"
    :height="size ?? 200"
    alt="QR code"
    class="rounded-xl"
  />
</template>
