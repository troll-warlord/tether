<template>
  <div class="app-group" :class="{ 'is-helm': data.helmRelease }">
    <!-- Group header bar -->
    <div class="app-group__header">
      <div class="app-group__title-row">
        <!-- Helm or namespace icon -->
        <img
          v-if="data.helmRelease"
          src="/k8s-icons/helm.svg"
          width="13"
          height="13"
          draggable="false"
          class="opacity-80 flex-shrink-0"
        />
        <Box v-else :size="12" class="opacity-60 flex-shrink-0 text-text-muted" />
        <span class="app-group__name" :title="data.appName">{{ data.appName }}</span>
        <span v-if="data.helmRelease" class="app-group__helm-badge">Helm</span>
      </div>
      <span class="app-group__ns">{{ data.ns }}</span>
    </div>

    <!-- Section dividers (rendered as visual cues, not blocking) -->
    <!-- The actual child nodes are rendered by Vue Flow inside this parent -->
  </div>
</template>

<script setup>
import { Box } from 'lucide-vue-next'

defineProps({
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})
</script>

<style scoped>
.app-group {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  border: 1.5px solid var(--color-border-strong);
  background: color-mix(in srgb, var(--color-bg-surface) 92%, transparent);
  overflow: visible;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  transition: border-color 0.15s;
}

.app-group.is-helm {
  border-color: color-mix(in srgb, #0f6fff 40%, var(--color-border-strong));
  background: color-mix(in srgb, #0f6fff 4%, var(--color-bg-surface));
}

.app-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-bottom: 1px solid var(--color-border);
  border-radius: 9px 9px 0 0;
  background: color-mix(in srgb, var(--color-bg-elevated) 60%, transparent);
}

.app-group__title-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
}

.app-group__name {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}

.app-group__helm-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  background: color-mix(in srgb, #0f6fff 15%, transparent);
  color: #0f6fff;
  border: 1px solid color-mix(in srgb, #0f6fff 30%, transparent);
  flex-shrink: 0;
  white-space: nowrap;
}

.app-group__ns {
  font-size: 10px;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
