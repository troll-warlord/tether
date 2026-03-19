<template>
  <StatusBadge :status="containerStatus" />
</template>

<script setup>
import { computed } from 'vue'
import StatusBadge from '../ui/StatusBadge.vue'

const props = defineProps({
  statuses: { type: Array, default: () => [] },
  name: { type: String, required: true },
})

const containerStatus = computed(() => {
  const cs = (props.statuses || []).find((s) => s.name === props.name)
  if (!cs) return 'Unknown'
  if (cs.state?.running) return 'Running'
  if (cs.state?.terminated) return cs.state.terminated.reason || 'Terminated'
  if (cs.state?.waiting) return cs.state.waiting.reason || 'Waiting'
  return 'Unknown'
})
</script>
