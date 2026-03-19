<template>
  <div class="flex flex-col items-center justify-center gap-md text-text-muted" :style="{ height }">
    <component :is="iconComponent" :size="40" class="opacity-40" />
    <p class="text-body">{{ message }}</p>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertCircle, Inbox, WifiOff, SearchX } from 'lucide-vue-next'

const props = defineProps({
  type: { type: String, default: 'empty' }, // empty | error | offline | no-results
  message: { type: String, default: 'Nothing here yet.' },
  height: { type: String, default: '200px' },
})

const iconComponent = computed(() => {
  switch (props.type) {
    case 'error':
      return AlertCircle
    case 'offline':
      return WifiOff
    case 'no-results':
      return SearchX
    default:
      return Inbox
  }
})
</script>
