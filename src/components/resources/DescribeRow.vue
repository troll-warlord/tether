<template>
  <dt class="text-text-muted pr-lg py-xs whitespace-nowrap">{{ label }}</dt>
  <dd class="py-xs" :class="mono ? 'font-mono text-mono text-text-primary' : 'text-text-secondary'">
    {{ value }}
  </dd>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, default: '—' },
  mono: { type: Boolean, default: false },
})
</script>
