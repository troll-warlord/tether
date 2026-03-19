<template>
  <div class="flex flex-col h-full bg-bg-base">
    <!-- Header -->
    <header
      class="flex items-center justify-between flex-shrink-0 px-xl border-b border-border bg-bg-surface"
      :style="{ height: 'var(--header-height)' }"
    >
      <div class="flex items-center gap-sm">
        <LayoutDashboard :size="16" class="text-brand" />
        <h1 class="text-heading-sm font-semibold text-text-primary">Overview</h1>
      </div>
      <div class="flex items-center gap-sm">
        <span class="badge badge-unknown text-caption hidden md:inline-flex">
          <LayoutGrid :size="11" />
          {{ nsLabel }}
        </span>
        <button
          class="btn-ghost btn-sm"
          :disabled="anyLoading"
          title="Refresh all"
          @click="fetchAll"
        >
          <RefreshCw :size="14" :class="{ spin: anyLoading }" />
        </button>
      </div>
    </header>

    <!-- Scrollable body -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-xl" style="max-width: 1280px">
        <!-- First-load spinner -->
        <div v-if="anyLoading && !hasAnyData" class="flex items-center justify-center h-64">
          <Spinner height="80px" />
        </div>

        <template v-else>
          <!-- ── Stat cards ── -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-md mb-xl">
            <!-- Pods -->
            <div class="card p-md">
              <div class="flex items-start justify-between mb-sm">
                <span class="text-caption uppercase tracking-wider font-medium text-text-muted">
                  Pods
                </span>
                <img src="/k8s-icons/pod.svg" width="20" height="20" draggable="false" />
              </div>
              <p class="text-heading-lg font-bold text-text-primary leading-none">
                {{ podStats.running }}
                <span class="text-body text-text-muted font-normal">/{{ podStats.total }}</span>
              </p>
              <p class="text-body-sm text-text-muted mt-xs">running</p>
              <div
                v-if="podStats.failed"
                class="text-caption mt-xs"
                style="color: var(--color-status-failed)"
              >
                {{ podStats.failed }} failing
              </div>
              <div class="mt-sm h-[3px] rounded-full bg-bg-elevated overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-slow"
                  :style="{
                    width: podStats.total ? (podStats.running / podStats.total) * 100 + '%' : '0%',
                    background: podStats.failed
                      ? 'var(--color-status-failed)'
                      : 'var(--color-status-running)',
                  }"
                />
              </div>
            </div>

            <!-- Deployments -->
            <div class="card p-md">
              <div class="flex items-start justify-between mb-sm">
                <span class="text-caption uppercase tracking-wider font-medium text-text-muted">
                  Deployments
                </span>
                <img src="/k8s-icons/deploy.svg" width="20" height="20" draggable="false" />
              </div>
              <p class="text-heading-lg font-bold text-text-primary leading-none">
                {{ deployStats.available }}
                <span class="text-body text-text-muted font-normal">/{{ deployStats.total }}</span>
              </p>
              <p class="text-body-sm text-text-muted mt-xs">available</p>
              <div
                v-if="deployStats.degraded"
                class="text-caption mt-xs"
                style="color: var(--color-status-warning)"
              >
                {{ deployStats.degraded }} degraded
              </div>
              <div class="mt-sm h-[3px] rounded-full bg-bg-elevated overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-slow"
                  :style="{
                    width: deployStats.total
                      ? (deployStats.available / deployStats.total) * 100 + '%'
                      : '0%',
                    background: deployStats.degraded
                      ? 'var(--color-status-warning)'
                      : 'var(--color-status-running)',
                  }"
                />
              </div>
            </div>

            <!-- Services -->
            <div class="card p-md">
              <div class="flex items-start justify-between mb-sm">
                <span class="text-caption uppercase tracking-wider font-medium text-text-muted">
                  Services
                </span>
                <img src="/k8s-icons/svc.svg" width="20" height="20" draggable="false" />
              </div>
              <p class="text-heading-lg font-bold text-text-primary leading-none">
                {{ services.length }}
              </p>
              <p class="text-body-sm text-text-muted mt-xs">total</p>
              <p class="text-caption mt-xs text-text-muted">{{ lbCount }} LoadBalancer</p>
            </div>

            <!-- Namespaces -->
            <div class="card p-md">
              <div class="flex items-start justify-between mb-sm">
                <span class="text-caption uppercase tracking-wider font-medium text-text-muted">
                  Namespaces
                </span>
                <LayoutGrid :size="20" class="text-text-muted" />
              </div>
              <p class="text-heading-lg font-bold text-text-primary leading-none">{{ nsCount }}</p>
              <p class="text-body-sm text-text-muted mt-xs">in cluster</p>
              <p class="text-caption mt-xs text-text-muted">viewing {{ nsLabel }}</p>
            </div>
          </div>

          <!-- ── Charts row ── -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-xl mb-xl">
            <!-- Pod status donut -->
            <div class="card p-lg flex flex-col">
              <h3 class="text-label font-semibold text-text-secondary mb-lg">Pod Status</h3>
              <div
                v-if="!pods.length"
                class="flex items-center justify-center flex-1"
                style="min-height: 160px"
              >
                <EmptyState type="empty" message="No pods fetched yet." height="100px" />
              </div>
              <div v-else class="flex items-center gap-xl">
                <!-- Donut with centre label -->
                <div class="relative flex-shrink-0" style="width: 155px; height: 155px">
                  <Doughnut :data="donutData" :options="donutOptions" :key="'d-' + chartKey" />
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <span class="text-heading font-bold text-text-primary leading-none">
                      {{ pods.length }}
                    </span>
                    <span class="text-caption text-text-muted mt-xs">pods</span>
                  </div>
                </div>
                <!-- Custom legend -->
                <ul class="flex-1 space-y-sm">
                  <li
                    v-for="entry in donutLegend"
                    :key="entry.label"
                    class="flex items-center justify-between text-body-sm"
                  >
                    <div class="flex items-center gap-sm">
                      <span
                        class="w-[10px] h-[10px] rounded-sm flex-shrink-0"
                        :style="{ background: entry.color }"
                      />
                      <span class="text-text-secondary">{{ entry.label }}</span>
                    </div>
                    <span class="font-medium tabular-nums text-text-primary">
                      {{ entry.count }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Workload health bars -->
            <div class="card p-lg flex flex-col">
              <h3 class="text-label font-semibold text-text-secondary mb-lg">Workload Health</h3>
              <div
                v-if="!workloadsHaveData"
                class="flex items-center justify-center flex-1"
                style="min-height: 160px"
              >
                <EmptyState type="empty" message="No workloads loaded." height="100px" />
              </div>
              <div v-else class="relative flex-1" style="min-height: 180px">
                <Bar :data="barData" :options="barOptions" :key="'b-' + chartKey" />
              </div>
            </div>
          </div>

          <!-- ── Issues ── -->
          <div v-if="issues.length" class="card mb-xl overflow-hidden">
            <div class="flex items-center gap-sm px-md py-sm border-b border-border">
              <AlertTriangle :size="14" style="color: var(--color-status-warning)" />
              <h3 class="text-label font-semibold text-text-primary">
                Issues
                <span class="ml-xs badge badge-warning">{{ issues.length }}</span>
              </h3>
            </div>
            <div class="overflow-x-auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Kind</th>
                    <th>Namespace</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="r in issues"
                    :key="r.uid"
                    class="cursor-pointer"
                    style="transition: background 0.1s"
                    @mouseenter="
                      (e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')
                    "
                    @mouseleave="(e) => (e.currentTarget.style.background = '')"
                    @click="$emit('select-resource', r._kind)"
                  >
                    <td class="font-mono text-mono">{{ r.name }}</td>
                    <td class="text-text-secondary">{{ r.kind }}</td>
                    <td class="text-text-secondary">{{ r.namespace || '—' }}</td>
                    <td><StatusBadge :status="r.status" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ── Quick access ── -->
          <div class="mb-xl">
            <p class="text-caption text-text-muted mb-sm uppercase tracking-wider font-medium">
              Quick Access
            </p>
            <div class="flex flex-wrap gap-sm">
              <button
                v-for="q in quickLinks"
                :key="q.id"
                class="btn-secondary flex items-center gap-xs"
                @click="$emit('select-resource', q.id)"
              >
                <img :src="`/k8s-icons/${q.icon}.svg`" width="14" height="14" draggable="false" />
                {{ q.label }}
              </button>
            </div>
          </div>

          <!-- ── Extra charts row ── -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-xl mb-xl">
            <!-- Service Types donut -->
            <div class="card p-lg flex flex-col">
              <h3 class="text-label font-semibold text-text-secondary mb-lg">Service Types</h3>
              <div
                v-if="!services.length"
                class="flex items-center justify-center flex-1"
                style="min-height: 160px"
              >
                <EmptyState type="empty" message="No services loaded." height="100px" />
              </div>
              <div v-else class="flex items-center gap-xl">
                <div class="relative flex-shrink-0" style="width: 155px; height: 155px">
                  <Doughnut
                    :data="svcTypeDonutData"
                    :options="donutOptions"
                    :key="'svc-' + chartKey"
                  />
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <span class="text-heading font-bold text-text-primary leading-none">
                      {{ services.length }}
                    </span>
                    <span class="text-caption text-text-muted mt-xs">services</span>
                  </div>
                </div>
                <ul class="flex-1 space-y-sm">
                  <li
                    v-for="entry in svcTypeLegend"
                    :key="entry.label"
                    class="flex items-center justify-between text-body-sm"
                  >
                    <div class="flex items-center gap-sm">
                      <span
                        class="w-[10px] h-[10px] rounded-sm flex-shrink-0"
                        :style="{ background: entry.color }"
                      />
                      <span class="text-text-secondary">{{ entry.label }}</span>
                    </div>
                    <span class="font-medium tabular-nums text-text-primary">
                      {{ entry.count }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Top Restarting Pods -->
            <div class="card p-lg flex flex-col">
              <h3 class="text-label font-semibold text-text-secondary mb-lg">
                Top Restarting Pods
              </h3>
              <div
                v-if="!topRestartingPods.length"
                class="flex items-center justify-center flex-1"
                style="min-height: 160px"
              >
                <EmptyState type="empty" message="No restart data." height="100px" />
              </div>
              <div v-else class="relative flex-1" style="min-height: 180px">
                <Bar :data="restartBarData" :options="restartBarOptions" :key="'r-' + chartKey" />
              </div>
            </div>
          </div>

          <!-- ── PVC Status + Namespace distribution ── -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-xl mb-xl">
            <!-- PVC Status donut -->
            <div class="card p-lg flex flex-col">
              <h3 class="text-label font-semibold text-text-secondary mb-lg">PVC Status</h3>
              <div
                v-if="!pvcs.length"
                class="flex items-center justify-center flex-1"
                style="min-height: 160px"
              >
                <EmptyState type="empty" message="No PVCs found." height="100px" />
              </div>
              <div v-else class="flex items-center gap-xl">
                <div class="relative flex-shrink-0" style="width: 155px; height: 155px">
                  <Doughnut :data="pvcDonutData" :options="donutOptions" :key="'pvc-' + chartKey" />
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <span class="text-heading font-bold text-text-primary leading-none">
                      {{ pvcs.length }}
                    </span>
                    <span class="text-caption text-text-muted mt-xs">pvcs</span>
                  </div>
                </div>
                <ul class="flex-1 space-y-sm">
                  <li
                    v-for="entry in pvcLegend"
                    :key="entry.label"
                    class="flex items-center justify-between text-body-sm"
                  >
                    <div class="flex items-center gap-sm">
                      <span
                        class="w-[10px] h-[10px] rounded-sm flex-shrink-0"
                        :style="{ background: entry.color }"
                      />
                      <span class="text-text-secondary">{{ entry.label }}</span>
                    </div>
                    <span class="font-medium tabular-nums text-text-primary">
                      {{ entry.count }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Namespace workload distribution -->
            <div class="card p-lg flex flex-col">
              <h3 class="text-label font-semibold text-text-secondary mb-lg">
                Workloads per Namespace
              </h3>
              <div
                v-if="!nsDistHasData"
                class="flex items-center justify-center flex-1"
                style="min-height: 160px"
              >
                <EmptyState type="empty" message="No workload data." height="100px" />
              </div>
              <div v-else class="relative flex-1" style="min-height: 180px">
                <Bar :data="nsDistBarData" :options="nsDistBarOptions" :key="'ns-' + chartKey" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import { RefreshCw, LayoutGrid, LayoutDashboard, AlertTriangle } from 'lucide-vue-next'
import { useResourceStore } from '../../stores/resources'
import { useNamespaceStore, ALL_NAMESPACES } from '../../stores/namespaces'
import { useUiStore } from '../../stores/ui'
import StatusBadge from '../ui/StatusBadge.vue'
import Spinner from '../ui/Spinner.vue'
import EmptyState from '../ui/EmptyState.vue'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

defineEmits(['select-resource'])

const resourceStore = useResourceStore()
const nsStore = useNamespaceStore()
const uiStore = useUiStore()

// ── Theme-aware chart re-rendering ─────────────────────────────────────────
const chartKey = ref(0)
watch(
  () => uiStore.theme,
  () => {
    chartKey.value++
  },
)

// ── Namespace ──────────────────────────────────────────────────────────────
const nsLabel = computed(() =>
  nsStore.selectedNamespace === ALL_NAMESPACES ? 'All Namespaces' : nsStore.selectedNamespace,
)
const nsCount = computed(() => nsStore.namespaceOptions.length)

// ── Cached resource lists ──────────────────────────────────────────────────
const pods = computed(() => resourceStore.cache['pods']?.items ?? [])
const deployments = computed(() => resourceStore.cache['deployments']?.items ?? [])
const statefulsets = computed(() => resourceStore.cache['statefulsets']?.items ?? [])
const daemonsets = computed(() => resourceStore.cache['daemonsets']?.items ?? [])
const services = computed(() => resourceStore.cache['services']?.items ?? [])
const pvcs = computed(() => resourceStore.cache['persistentvolumeclaims']?.items ?? [])

const FETCH_TARGETS = [
  'pods',
  'deployments',
  'statefulsets',
  'daemonsets',
  'services',
  'persistentvolumeclaims',
]

const anyLoading = computed(() => FETCH_TARGETS.some((k) => resourceStore.cache[k]?.loading))
const hasAnyData = computed(() =>
  FETCH_TARGETS.some((k) => (resourceStore.cache[k]?.items?.length ?? 0) > 0),
)
const workloadsHaveData = computed(
  () =>
    deployments.value.length > 0 || statefulsets.value.length > 0 || daemonsets.value.length > 0,
)

// ── Stat cards ─────────────────────────────────────────────────────────────
const FAILING = new Set([
  'Failed',
  'CrashLoopBackOff',
  'OOMKilled',
  'ImagePullBackOff',
  'ErrImagePull',
  'Error',
])

const podStats = computed(() => ({
  total: pods.value.length,
  running: pods.value.filter((p) => p.status === 'Running').length,
  failed: pods.value.filter((p) => FAILING.has(p.status)).length,
}))

const deployStats = computed(() => ({
  total: deployments.value.length,
  available: deployments.value.filter((d) => d.status === 'Available').length,
  degraded: deployments.value.filter((d) => ['Degraded', 'Progressing'].includes(d.status)).length,
}))

const lbCount = computed(
  () => services.value.filter((s) => s.raw?.spec?.type === 'LoadBalancer').length,
)

// ── Chart color helpers ────────────────────────────────────────────────────
function cssVar(name) {
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// ── Donut chart ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Running: '#4ade80',
  Pending: '#fbbf24',
  Failed: '#f87171',
  CrashLoopBackOff: '#f97316',
  OOMKilled: '#ef4444',
  ImagePullBackOff: '#fb923c',
  'Not Ready': '#60a5fa',
  Terminating: '#a78bfa',
  Succeeded: '#34d399',
  'Scaled Down': '#6b7280',
  Other: '#9ca3af',
}

const KNOWN_STATUSES = new Set(Object.keys(STATUS_COLORS))

const donutCounts = computed(() => {
  const counts = {}
  for (const pod of pods.value) {
    const key = KNOWN_STATUSES.has(pod.status) ? pod.status : 'Other'
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
})

const donutData = computed(() => ({
  labels: donutCounts.value.map(([k]) => k),
  datasets: [
    {
      data: donutCounts.value.map(([, v]) => v),
      backgroundColor: donutCounts.value.map(([k]) => STATUS_COLORS[k] ?? '#9ca3af'),
      borderWidth: 2,
      borderColor: cssVar('--color-bg-elevated') || '#1a1d27',
      hoverBorderWidth: 2,
    },
  ],
}))

const donutLegend = computed(() =>
  donutCounts.value.map(([label, count]) => ({
    label,
    count,
    color: STATUS_COLORS[label] ?? '#9ca3af',
  })),
)

const donutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: cssVar('--color-bg-elevated') || '#212436',
      titleColor: cssVar('--color-text-primary') || '#f1f3f9',
      bodyColor: cssVar('--color-text-muted') || '#9ca3af',
      borderColor: cssVar('--color-border') || '#2d3148',
      borderWidth: 1,
      padding: 10,
    },
  },
}))

// ── Bar chart ──────────────────────────────────────────────────────────────
const barData = computed(() => {
  const rows = [
    {
      label: 'Deployments',
      ready: deployments.value.filter((d) => d.status === 'Available').length,
      not_ready: deployments.value.filter((d) => !['Available', 'Scaled Down'].includes(d.status))
        .length,
      scaled: deployments.value.filter((d) => d.status === 'Scaled Down').length,
    },
    {
      label: 'StatefulSets',
      ready: statefulsets.value.filter((d) => d.status === 'Running').length,
      not_ready: statefulsets.value.filter((d) => !['Running', 'Scaled Down'].includes(d.status))
        .length,
      scaled: statefulsets.value.filter((d) => d.status === 'Scaled Down').length,
    },
    {
      label: 'DaemonSets',
      ready: daemonsets.value.filter((d) => d.status === 'Running').length,
      not_ready: daemonsets.value.filter((d) => d.status !== 'Running').length,
      scaled: 0,
    },
  ].filter((r) => r.ready + r.not_ready + r.scaled > 0)

  if (!rows.length) {
    return { labels: [], datasets: [] }
  }

  return {
    labels: rows.map((r) => r.label),
    datasets: [
      {
        label: 'Ready',
        data: rows.map((r) => r.ready),
        backgroundColor: '#4ade80',
        borderRadius: 3,
        borderSkipped: false,
      },
      {
        label: 'Not Ready',
        data: rows.map((r) => r.not_ready),
        backgroundColor: '#f87171',
        borderRadius: 3,
        borderSkipped: false,
      },
      {
        label: 'Scaled Down',
        data: rows.map((r) => r.scaled),
        backgroundColor: '#6b7280',
        borderRadius: 3,
        borderSkipped: false,
      },
    ],
  }
})

const barOptions = computed(() => {
  const textMuted = cssVar('--color-text-muted') || '#6b7280'
  const border = cssVar('--color-border') || '#2d3148'
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: textMuted,
          boxWidth: 10,
          boxHeight: 10,
          padding: 14,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: cssVar('--color-bg-elevated') || '#212436',
        titleColor: cssVar('--color-text-primary') || '#f1f3f9',
        bodyColor: cssVar('--color-text-muted') || '#9ca3af',
        borderColor: border,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: border + '60' },
        ticks: { color: textMuted, font: { size: 11 }, stepSize: 1 },
        border: { color: border },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: { color: textMuted, font: { size: 11 } },
        border: { color: 'transparent' },
      },
    },
  }
})

// ── Service Types donut ────────────────────────────────────────────────────
const SVC_TYPE_COLORS = {
  ClusterIP: '#60a5fa',
  LoadBalancer: '#4ade80',
  NodePort: '#fbbf24',
  ExternalName: '#a78bfa',
  Other: '#9ca3af',
}

const svcTypeCounts = computed(() => {
  const counts = {}
  for (const svc of services.value) {
    const t = svc.raw?.spec?.type ?? 'Other'
    const key = SVC_TYPE_COLORS[t] ? t : 'Other'
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
})

const svcTypeDonutData = computed(() => ({
  labels: svcTypeCounts.value.map(([k]) => k),
  datasets: [
    {
      data: svcTypeCounts.value.map(([, v]) => v),
      backgroundColor: svcTypeCounts.value.map(([k]) => SVC_TYPE_COLORS[k] ?? '#9ca3af'),
      borderWidth: 2,
      borderColor: cssVar('--color-bg-elevated') || '#1a1d27',
      hoverBorderWidth: 2,
    },
  ],
}))

const svcTypeLegend = computed(() =>
  svcTypeCounts.value.map(([label, count]) => ({
    label,
    count,
    color: SVC_TYPE_COLORS[label] ?? '#9ca3af',
  })),
)

// ── Top Restarting Pods bar ────────────────────────────────────────────────
const topRestartingPods = computed(() => {
  return pods.value
    .map((p) => ({
      name: p.name,
      restarts:
        p.raw?.status?.containerStatuses?.reduce((s, c) => s + (c.restartCount ?? 0), 0) ?? 0,
    }))
    .filter((p) => p.restarts > 0)
    .sort((a, b) => b.restarts - a.restarts)
    .slice(0, 8)
})

const restartBarData = computed(() => ({
  labels: topRestartingPods.value.map((p) =>
    p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name,
  ),
  datasets: [
    {
      label: 'Restarts',
      data: topRestartingPods.value.map((p) => p.restarts),
      backgroundColor: '#f97316',
      borderRadius: 3,
      borderSkipped: false,
    },
  ],
}))

const restartBarOptions = computed(() => {
  const textMuted = cssVar('--color-text-muted') || '#6b7280'
  const border = cssVar('--color-border') || '#2d3148'
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar('--color-bg-elevated') || '#212436',
        titleColor: cssVar('--color-text-primary') || '#f1f3f9',
        bodyColor: textMuted,
        borderColor: border,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: border + '60' },
        ticks: { color: textMuted, font: { size: 11 }, stepSize: 1 },
        border: { color: border },
      },
      y: {
        grid: { display: false },
        ticks: { color: textMuted, font: { size: 11 } },
        border: { color: 'transparent' },
      },
    },
  }
})

// ── PVC Status donut ───────────────────────────────────────────────────────
const PVC_STATUS_COLORS = {
  Bound: '#4ade80',
  Pending: '#fbbf24',
  Lost: '#f87171',
  Other: '#9ca3af',
}

const pvcCounts = computed(() => {
  const counts = {}
  for (const pvc of pvcs.value) {
    const phase = pvc.raw?.status?.phase ?? 'Other'
    const key = PVC_STATUS_COLORS[phase] ? phase : 'Other'
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
})

const pvcDonutData = computed(() => ({
  labels: pvcCounts.value.map(([k]) => k),
  datasets: [
    {
      data: pvcCounts.value.map(([, v]) => v),
      backgroundColor: pvcCounts.value.map(([k]) => PVC_STATUS_COLORS[k] ?? '#9ca3af'),
      borderWidth: 2,
      borderColor: cssVar('--color-bg-elevated') || '#1a1d27',
      hoverBorderWidth: 2,
    },
  ],
}))

const pvcLegend = computed(() =>
  pvcCounts.value.map(([label, count]) => ({
    label,
    count,
    color: PVC_STATUS_COLORS[label] ?? '#9ca3af',
  })),
)

// ── Namespace workload distribution bar ───────────────────────────────────
const nsDistHasData = computed(
  () => deployments.value.length > 0 || pods.value.length > 0 || statefulsets.value.length > 0,
)

const nsDistBarData = computed(() => {
  const nsCounts = {}
  const addItem = (items, key) => {
    for (const item of items) {
      const ns = item.namespace || item.raw?.metadata?.namespace || 'default'
      if (!nsCounts[ns]) nsCounts[ns] = { pods: 0, deployments: 0, statefulsets: 0 }
      nsCounts[ns][key]++
    }
  }
  addItem(pods.value, 'pods')
  addItem(deployments.value, 'deployments')
  addItem(statefulsets.value, 'statefulsets')

  const sorted = Object.entries(nsCounts)
    .sort(
      (a, b) =>
        b[1].pods +
        b[1].deployments +
        b[1].statefulsets -
        (a[1].pods + a[1].deployments + a[1].statefulsets),
    )
    .slice(0, 8)

  return {
    labels: sorted.map(([ns]) => (ns.length > 16 ? ns.slice(0, 14) + '…' : ns)),
    datasets: [
      {
        label: 'Pods',
        data: sorted.map(([, v]) => v.pods),
        backgroundColor: '#60a5fa',
        borderRadius: 3,
        borderSkipped: false,
      },
      {
        label: 'Deployments',
        data: sorted.map(([, v]) => v.deployments),
        backgroundColor: '#4ade80',
        borderRadius: 3,
        borderSkipped: false,
      },
      {
        label: 'StatefulSets',
        data: sorted.map(([, v]) => v.statefulsets),
        backgroundColor: '#a78bfa',
        borderRadius: 3,
        borderSkipped: false,
      },
    ],
  }
})

const nsDistBarOptions = computed(() => {
  const textMuted = cssVar('--color-text-muted') || '#6b7280'
  const border = cssVar('--color-border') || '#2d3148'
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: textMuted, boxWidth: 10, boxHeight: 10, padding: 14, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: cssVar('--color-bg-elevated') || '#212436',
        titleColor: cssVar('--color-text-primary') || '#f1f3f9',
        bodyColor: textMuted,
        borderColor: border,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: border + '60' },
        ticks: { color: textMuted, font: { size: 11 }, stepSize: 1 },
        border: { color: border },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: { color: textMuted, font: { size: 11 } },
        border: { color: 'transparent' },
      },
    },
  }
})

// ── Issues list ────────────────────────────────────────────────────────────
const UNHEALTHY = new Set([
  'Failed',
  'CrashLoopBackOff',
  'OOMKilled',
  'ImagePullBackOff',
  'ErrImagePull',
  'Degraded',
  'Not Ready',
  'Terminating',
  'Error',
])

const issues = computed(() =>
  [...pods.value, ...deployments.value, ...statefulsets.value, ...daemonsets.value]
    .filter((r) => UNHEALTHY.has(r.status))
    .slice(0, 20),
)

// ── Quick links ────────────────────────────────────────────────────────────
const quickLinks = [
  { id: 'pods', label: 'Pods', icon: 'pod' },
  { id: 'deployments', label: 'Deployments', icon: 'deploy' },
  { id: 'services', label: 'Services', icon: 'svc' },
  { id: 'statefulsets', label: 'StatefulSets', icon: 'sts' },
  { id: 'persistentvolumeclaims', label: 'PVCs', icon: 'pvc' },
  { id: 'configmaps', label: 'ConfigMaps', icon: 'cm' },
  { id: 'secrets', label: 'Secrets', icon: 'secret' },
  { id: 'helm-releases', label: 'Helm Releases', icon: 'helm' },
]

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchAll() {
  await Promise.allSettled(FETCH_TARGETS.map((id) => resourceStore.fetchResource(id)))
}

watch(
  () => nsStore.selectedNamespace,
  () => fetchAll(),
  { immediate: true },
)

let pollTimer = null
onMounted(() => {
  pollTimer = setInterval(fetchAll, 30_000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>
