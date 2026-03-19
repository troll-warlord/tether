<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center"
        style="background: var(--color-bg-overlay)"
        @mousedown.self="$emit('update:modelValue', false)"
      >
        <div class="card-elevated w-full max-w-md mx-md" role="dialog" :aria-label="title">
          <!-- Header -->
          <div class="flex items-center justify-between p-md border-b border-border">
            <h2 class="text-heading-sm font-semibold text-text-primary">{{ title }}</h2>
            <button class="btn-ghost btn-sm" @click="$emit('update:modelValue', false)">
              <X :size="16" />
            </button>
          </div>
          <!-- Content -->
          <div class="p-md">
            <slot />
          </div>
          <!-- Footer -->
          <div v-if="$slots.footer" class="flex justify-end gap-sm p-md border-t border-border">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { X } from 'lucide-vue-next'
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>
