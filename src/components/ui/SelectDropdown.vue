<template>
  <div class="relative inline-block w-full" ref="rootRef">
    <button
      type="button"
      class="flex items-center justify-between w-full gap-xs input text-left"
      :class="{ 'border-brand': open }"
      @click="toggle"
    >
      <span class="truncate">{{ selectedLabel }}</span>
      <ChevronDown
        :size="14"
        class="flex-shrink-0 text-text-muted transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <Transition name="fade">
      <ul
        v-if="open"
        class="absolute z-50 mt-xs w-full bg-bg-elevated border border-border rounded-lg shadow-overlay overflow-auto"
        style="max-height: 240px"
      >
        <li
          v-for="opt in options"
          :key="opt.value"
          class="flex items-center justify-between px-sm py-xs text-body cursor-pointer hover:bg-bg-surface transition-colors"
          :class="{ 'text-brand font-medium': opt.value === modelValue }"
          @click="select(opt.value)"
        >
          {{ opt.label }}
          <Check v-if="opt.value === modelValue" :size="12" class="text-brand" />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] }, // [{ value, label }]
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)

const selectedLabel = computed(() => {
  const opt = props.options.find((o) => o.value === props.modelValue)
  return opt?.label ?? props.modelValue
})

function toggle() {
  open.value = !open.value
}

function select(val) {
  emit('update:modelValue', val)
  open.value = false
}

function onClickOutside(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>
