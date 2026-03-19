<template>
  <div
    class="k8s-node"
    :class="[
      `kind-${data.resourceKind}`,
      {
        'is-selected': selected,
        'is-faded': data.faded,
        'is-config': data.configStyle,
        'is-storage': data.storageStyle,
        'is-external': data.externalStyle,
      },
    ]"
  >
    <!-- Header: icon + name -->
    <div class="k8s-node__header">
      <img :src="data.icon" width="16" height="16" draggable="false" class="k8s-node__icon" />
      <span class="k8s-node__name" :title="data.label">{{ data.label }}</span>
    </div>

    <!-- Footer: namespace + status badge (or storage size) -->
    <div class="k8s-node__footer">
      <span v-if="data.storageSize" class="k8s-node__storage-size">{{ data.storageSize }}</span>
      <span v-else class="k8s-node__ns" :title="data.namespace">{{ shortNs }}</span>
      <span class="k8s-node__badge" :class="badgeClass">{{ data.status }}</span>
    </div>

    <!-- Vue Flow handles -->
    <Handle type="source" :position="Position.Right" />
    <Handle type="target" :position="Position.Left" />

    <!-- Bottom handle for config/storage rows -->
    <Handle
      v-if="data.configStyle || data.storageStyle"
      type="target"
      :position="Position.Top"
      :id="'top'"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const BADGE_MAP = {
  Running: 'badge-running',
  Available: 'badge-running',
  Succeeded: 'badge-running',
  Bound: 'badge-running',
  Pending: 'badge-pending',
  Progressing: 'badge-pending',
  Failed: 'badge-failed',
  CrashLoopBackOff: 'badge-failed',
  OOMKilled: 'badge-failed',
  ImagePullBackOff: 'badge-failed',
  Lost: 'badge-failed',
  Degraded: 'badge-warning',
  Terminating: 'badge-warning',
  'Not Ready': 'badge-warning',
  'Scaled Down': 'badge-unknown',
  Unknown: 'badge-unknown',
}

const badgeClass = computed(() => BADGE_MAP[props.data.status] ?? 'badge-unknown')

// Truncate long namespace names
const shortNs = computed(() => {
  const ns = props.data.namespace ?? ''
  return ns.length > 14 ? ns.slice(0, 12) + '…' : ns
})
</script>

<style scoped>
.k8s-node {
  width: 190px;
  background: var(--color-bg-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 7px 9px 5px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    opacity 0.2s;
  box-shadow: var(--shadow-surface);
  position: relative;
}

.k8s-node:hover {
  border-color: var(--color-brand-muted);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-brand) 20%, transparent);
}

.k8s-node.is-selected {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand) 25%, transparent);
  z-index: 10;
}

.k8s-node.is-faded {
  opacity: 0.22;
  pointer-events: none;
}

/* Config nodes: subtle teal tint */
.k8s-node.is-config {
  background: color-mix(in srgb, #0d9488 5%, var(--color-bg-surface));
  border-color: color-mix(in srgb, #0d9488 35%, var(--color-border));
  border-style: dashed;
}

/* Storage nodes: subtle amber tint */
.k8s-node.is-storage {
  background: color-mix(in srgb, #d97706 5%, var(--color-bg-surface));
  border-color: color-mix(in srgb, #d97706 35%, var(--color-border));
  border-style: dashed;
}

/* Kind accent colours (left border) */
.k8s-node.kind-ingress {
  border-left: 3px solid #a78bfa;
}
.k8s-node.kind-service {
  border-left: 3px solid #60a5fa;
}
.k8s-node.kind-deployment {
  border-left: 3px solid #4ade80;
}
.k8s-node.kind-replicaset {
  border-left: 3px solid #86efac;
}
.k8s-node.kind-pod {
  border-left: 3px solid #fbbf24;
}
.k8s-node.kind-configmap {
  border-left: 3px solid #2dd4bf;
  border-left-style: solid;
}
.k8s-node.kind-secret {
  border-left: 3px solid #f472b6;
  border-left-style: solid;
}
.k8s-node.kind-persistentvolumeclaim {
  border-left: 3px solid #fb923c;
  border-left-style: solid;
}
.k8s-node.kind-persistentvolume {
  border-left: 3px solid #f97316;
  border-left-style: solid;
}
.k8s-node.kind-serviceaccount {
  border-left: 3px solid #818cf8;
}
.k8s-node.kind-statefulset {
  border-left: 3px solid #34d399;
}

/* External nodes: orange dashed — referenced but not Helm-owned */
.k8s-node.is-external {
  background: color-mix(in srgb, #f97316 6%, var(--color-bg-surface));
  border-color: color-mix(in srgb, #f97316 55%, var(--color-border));
  border-style: dashed;
}

/* Header */
.k8s-node__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.k8s-node__icon {
  flex-shrink: 0;
}

.k8s-node__name {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* Footer */
.k8s-node__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.k8s-node__ns,
.k8s-node__storage-size {
  font-size: 10px;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* Status badges */
.k8s-node__badge {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-running {
  background: var(--color-status-running-bg);
  color: var(--color-status-running);
}
.badge-pending {
  background: var(--color-status-pending-bg);
  color: var(--color-status-pending);
}
.badge-failed {
  background: var(--color-status-failed-bg);
  color: var(--color-status-failed);
}
.badge-warning {
  background: var(--color-status-warning-bg);
  color: var(--color-status-warning);
}
.badge-unknown {
  background: var(--color-status-unknown-bg);
  color: var(--color-status-unknown);
}
</style>
