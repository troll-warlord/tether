<template>
  <!-- Tabs row -->
  <div class="flex border-b border-border">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="px-md py-sm text-body-sm font-medium transition-colors border-b-2 -mb-px"
      :class="
        active === tab.id
          ? 'border-brand text-brand'
          : 'border-transparent text-text-muted hover:text-text-secondary'
      "
      @click="$emit('update:active', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  tabs: { type: Array, required: true }, // [{ id, label }]
  active: { type: String, required: true },
})
defineEmits(['update:active'])
</script>
