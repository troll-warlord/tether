<template>
  <span :class="badgeClass">
    <span
      v-if="showDot"
      class="inline-block w-[6px] h-[6px] rounded-full"
      :style="{ background: 'currentColor' }"
    />
    {{ displayStatus }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusToBadgeClass } from '../../api/k8s'

const props = defineProps({
  status: { type: String, default: 'Unknown' },
  showDot: { type: Boolean, default: true },
})

const badgeClass = computed(() => statusToBadgeClass(props.status))
const displayStatus = computed(() => props.status || 'Unknown')
</script>
