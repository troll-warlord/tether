<template>
  <div class="app-grid-shell flex flex-col h-full bg-bg-base">
    <!-- Search bar -->
    <div
      class="flex items-center gap-sm px-xl py-sm border-b border-border bg-bg-surface flex-shrink-0"
    >
      <Search :size="14" class="text-text-muted flex-shrink-0" />
      <input
        v-model="search"
        type="text"
        placeholder="Filter applications…"
        class="flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
      />
      <span v-if="filtered.length !== groups.length" class="badge badge-unknown text-caption">
        {{ filtered.length }} / {{ groups.length }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center flex-1">
      <Spinner height="72px" />
    </div>

    <!-- Empty -->
    <div v-else-if="!groups.length" class="flex items-center justify-center flex-1">
      <EmptyState type="empty" message="No Helm releases found in this namespace." height="120px" />
    </div>

    <!-- Bento grid -->
    <div v-else class="flex-1 overflow-y-auto p-xl">
      <div class="app-bento-grid">
        <div
          v-for="app in filtered"
          :key="app.key"
          class="app-card"
          :class="[`health-${app.health}`, { 'is-helm': !!app.helmRelease }]"
          @click="$emit('drill-in', app)"
        >
          <!-- Card header -->
          <div class="app-card__header">
            <div class="app-card__title-row">
              <img
                v-if="app.helmRelease"
                src="/k8s-icons/helm.svg"
                width="14"
                height="14"
                draggable="false"
                class="flex-shrink-0 opacity-90"
              />
              <div v-else class="app-card__dot" :class="`dot-${app.health}`" />
              <span class="app-card__name" :title="app.appName">{{ app.appName }}</span>
            </div>
            <div class="flex items-center gap-xs">
              <span
                v-if="app.helmRelease"
                class="app-card__helm-badge"
                :class="`helm-status-${app.helmStatus}`"
              >
                {{ app.helmStatus ?? 'Helm' }}
              </span>
              <span class="app-card__ns">{{ app.ns }}</span>
            </div>
          </div>

          <!-- Chart name subtitle -->
          <div v-if="app.chartName && app.chartName !== app.appName" class="app-card__chart-name">
            {{ app.chartName }}
          </div>

          <!-- Health bar (pod ratio) -->
          <div v-if="app.counts?.pods" class="app-card__health-bar-wrap">
            <div
              class="app-card__health-bar"
              :style="{
                width: app.counts?.pods ? (app.podsRunning / app.counts.pods) * 100 + '%' : '0%',
                background: app.podsFailed
                  ? 'var(--color-status-failed)'
                  : app.podsRunning === app.counts?.pods
                    ? 'var(--color-status-running)'
                    : 'var(--color-status-pending)',
              }"
            />
          </div>

          <!-- Resource chips row -->
          <div class="app-card__chips">
            <span v-if="app.counts?.pods" class="chip chip-pod">
              <img src="/k8s-icons/pod.svg" width="11" height="11" draggable="false" />
              {{ app.podsRunning }}/{{ app.counts.pods }}
            </span>
            <span v-if="app.counts?.deployments" class="chip chip-deploy">
              <img src="/k8s-icons/deploy.svg" width="11" height="11" draggable="false" />
              {{ app.counts.deployments }}
            </span>
            <span v-if="app.counts?.services" class="chip chip-svc">
              <img src="/k8s-icons/svc.svg" width="11" height="11" draggable="false" />
              {{ app.counts.services }}
            </span>
            <span v-if="app.counts?.ingresses" class="chip chip-ing">
              <img src="/k8s-icons/ing.svg" width="11" height="11" draggable="false" />
              {{ app.counts.ingresses }}
            </span>
            <span v-if="app.counts?.configmaps" class="chip chip-cfg">
              <img src="/k8s-icons/cm.svg" width="11" height="11" draggable="false" />
              {{ app.counts.configmaps }}
            </span>
            <span v-if="app.counts?.secrets" class="chip chip-sec">
              <img src="/k8s-icons/secret.svg" width="11" height="11" draggable="false" />
              {{ app.counts.secrets }}
            </span>
            <span v-if="app.counts?.pvcs" class="chip chip-pvc">
              <img src="/k8s-icons/pvc.svg" width="11" height="11" draggable="false" />
              {{ app.counts.pvcs }}
            </span>
          </div>

          <!-- Footer -->
          <div class="app-card__footer">
            <span class="app-card__status-text" :class="`status-${app.health}`">
              <span class="app-card__status-dot" :class="`dot-${app.health}`" />
              {{ healthLabel(app) }}
            </span>
            <span class="app-card__cta">
              View Graph
              <ArrowRight :size="11" class="inline-block" />
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, ArrowRight } from 'lucide-vue-next'
import Spinner from '../ui/Spinner.vue'
import EmptyState from '../ui/EmptyState.vue'

const props = defineProps({
  groups: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

defineEmits(['drill-in'])

const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.groups
  return props.groups.filter(
    (a) =>
      a.appName.toLowerCase().includes(q) ||
      a.ns.toLowerCase().includes(q) ||
      (a.chartName ?? '').toLowerCase().includes(q),
  )
})

function healthLabel(app) {
  if (app.health === 'failed') return `${app.podsFailed} failing`
  if (app.health === 'warning') return 'Degraded'
  if (app.health === 'healthy') return 'Healthy'
  return 'No pods'
}
</script>

<style scoped>
/* ── Bento grid ─────────────────────────────────────────────────────────── */
.app-bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

/* Large cards for helm / resource-rich apps */
.app-card.is-helm,
.app-card:has(.chip:nth-child(5)) {
  grid-column: span 2;
}

@media (max-width: 720px) {
  .app-card.is-helm,
  .app-card:has(.chip:nth-child(5)) {
    grid-column: span 1;
  }
}

/* ── Card base ─────────────────────────────────────────────────────────── */
.app-card {
  background: var(--color-bg-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  padding: 14px 16px 12px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.1s;
  box-shadow: var(--shadow-surface);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.app-card:hover {
  border-color: var(--color-brand-muted);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--color-brand) 15%, transparent),
    var(--shadow-elevated);
  transform: translateY(-1px);
}

/* Health-based left accent */
.app-card.health-healthy {
  border-left: 3px solid var(--color-status-running);
}
.app-card.health-warning {
  border-left: 3px solid var(--color-status-warning);
}
.app-card.health-failed {
  border-left: 3px solid var(--color-status-failed);
}
.app-card.health-unknown {
  border-left: 3px solid var(--color-status-unknown);
}

/* Helm tint */
.app-card.is-helm {
  background: color-mix(in srgb, #0f6fff 3%, var(--color-bg-surface));
  border-color: color-mix(in srgb, #0f6fff 30%, var(--color-border));
}

/* ── Card header ─────────────────────────────────────────────────────────── */
.app-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.app-card__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.app-card__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-card__helm-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  background: color-mix(in srgb, #0f6fff 15%, transparent);
  color: #0f6fff;
  border: 1px solid color-mix(in srgb, #0f6fff 30%, transparent);
  white-space: nowrap;
}

.app-card__ns {
  font-size: 10px;
  color: var(--color-text-muted);
  white-space: nowrap;
  text-align: right;
}

/* Health dot (small) in title row */
.app-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Health bar ───────────────────────────────────────────────────────────── */
.app-card__health-bar-wrap {
  height: 3px;
  border-radius: 2px;
  background: var(--color-bg-elevated);
  overflow: hidden;
}

.app-card__health-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* ── Resource chips ───────────────────────────────────────────────────────── */
.app-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.chip-pod {
  border-color: #fbbf2440;
  background: #fbbf2410;
  color: #92400e;
}
.chip-deploy {
  border-color: #4ade8040;
  background: #4ade8010;
  color: #166534;
}
.chip-svc {
  border-color: #60a5fa40;
  background: #60a5fa10;
  color: #1e40af;
}
.chip-ing {
  border-color: #a78bfa40;
  background: #a78bfa10;
  color: #5b21b6;
}
.chip-cfg {
  border-color: #2dd4bf40;
  background: #2dd4bf10;
  color: #134e4a;
}
.chip-sec {
  border-color: #f472b640;
  background: #f472b610;
  color: #831843;
}
.chip-pvc {
  border-color: #fb923c40;
  background: #fb923c10;
  color: #7c2d12;
}

[data-theme='dark'] .chip-pod {
  color: #fcd34d;
}

/* ── Chart name subtitle ──────────────────────────────────────────────────── */
.app-card__chart-name {
  font-size: 10px;
  color: var(--color-text-muted);
  line-height: 1.3;
  margin-top: -4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Helm status badge variants ───────────────────────────────────────────── */
.helm-status-deployed {
  background: color-mix(in srgb, #16a34a 15%, transparent);
  color: #16a34a;
  border-color: color-mix(in srgb, #16a34a 30%, transparent);
}
.helm-status-failed {
  background: color-mix(in srgb, #dc2626 15%, transparent);
  color: #dc2626;
  border-color: color-mix(in srgb, #dc2626 30%, transparent);
}
.helm-status-superseded {
  background: color-mix(in srgb, #6b7280 15%, transparent);
  color: #6b7280;
  border-color: color-mix(in srgb, #6b7280 30%, transparent);
}
.helm-status-pending-install,
.helm-status-pending-upgrade,
.helm-status-pending-rollback {
  background: color-mix(in srgb, #d97706 15%, transparent);
  color: #d97706;
  border-color: color-mix(in srgb, #d97706 30%, transparent);
}
[data-theme='dark'] .chip-deploy {
  color: #86efac;
}
[data-theme='dark'] .chip-svc {
  color: #93c5fd;
}
[data-theme='dark'] .chip-ing {
  color: #c4b5fd;
}
[data-theme='dark'] .chip-cfg {
  color: #5eead4;
}
[data-theme='dark'] .chip-sec {
  color: #f9a8d4;
}
[data-theme='dark'] .chip-pvc {
  color: #fdba74;
}

/* ── Card footer ───────────────────────────────────────────────────────────── */
.app-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

.app-card__status-text {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
}

.app-card__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-healthy {
  background: var(--color-status-running);
}
.dot-warning {
  background: var(--color-status-warning);
}
.dot-failed {
  background: var(--color-status-failed);
}
.dot-unknown {
  background: var(--color-status-unknown);
}

.status-healthy {
  color: var(--color-status-running);
}
.status-warning {
  color: var(--color-status-warning);
}
.status-failed {
  color: var(--color-status-failed);
}
.status-unknown {
  color: var(--color-status-unknown);
}

.app-card__cta {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-brand);
  opacity: 0;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.app-card:hover .app-card__cta {
  opacity: 1;
}
</style>
