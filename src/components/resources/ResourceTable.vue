<template>
  <div class="flex flex-col h-full overflow-hidden">
    <Spinner v-if="loading && items.length === 0" height="100%" label="Loading resources…" />

    <EmptyState
      v-else-if="!loading && items.length === 0"
      type="empty"
      message="No resources found."
      height="100%"
    />

    <div v-else class="flex-1 overflow-auto">
      <table class="data-table">
        <thead class="sticky top-0 bg-bg-surface z-10">
          <tr>
            <th>Name</th>
            <th v-if="showNamespace">Namespace</th>
            <th>Status</th>
            <th>Age</th>
            <th v-for="col in extraColumns" :key="col.key">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.uid"
            :class="{ selected: selectedUid === item.uid }"
            @click="$emit('select', item)"
          >
            <td>
              <span class="font-medium text-text-primary font-mono text-mono">{{ item.name }}</span>
            </td>
            <td v-if="showNamespace" class="text-text-secondary">{{ item.namespace || '—' }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td class="text-text-muted">{{ formatAge(item.creationTimestamp) }}</td>
            <td v-for="col in extraColumns" :key="col.key" class="text-text-secondary">
              {{ col.value(item) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Error banner -->
    <div
      v-if="error"
      class="flex items-center gap-sm px-md py-sm bg-status-failed-bg text-status-failed text-body-sm border-t border-border"
    >
      <AlertCircle :size="14" />
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { AlertCircle } from 'lucide-vue-next'
import StatusBadge from '../ui/StatusBadge.vue'
import Spinner from '../ui/Spinner.vue'
import EmptyState from '../ui/EmptyState.vue'
import { formatAge } from '../../composables/useFormatters'

defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  selectedUid: { type: String, default: null },
  showNamespace: { type: Boolean, default: true },
  extraColumns: { type: Array, default: () => [] }, // [{ key, label, value: fn }]
})
defineEmits(['select'])
</script>
