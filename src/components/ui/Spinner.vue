<template>
  <div class="flex items-center justify-center" :style="{ height: height }">
    <svg
      class="spin text-brand"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    >
      <path
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      />
    </svg>
    <span v-if="label" class="ml-sm text-body text-text-muted">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 20 },
  height: { type: String, default: '80px' },
  label: { type: String, default: '' },
})
</script>
