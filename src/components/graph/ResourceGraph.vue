<template>
  <div class="graph-shell flex flex-col h-full bg-bg-base">
    <!-- ── Toolbar ── -->
    <header
      class="flex items-center gap-sm flex-shrink-0 px-xl border-b border-border bg-bg-surface"
      :style="{ height: 'var(--header-height)' }"
    >
      <GitFork :size="16" class="text-brand flex-shrink-0" />

      <!-- Breadcrumb -->
      <div class="flex items-center gap-xs">
        <button
          class="text-heading-sm font-semibold transition-colors"
          :class="
            selectedApp
              ? 'text-text-muted hover:text-text-primary cursor-pointer'
              : 'text-text-primary'
          "
          @click="selectedApp = null"
        >
          Applications
        </button>
        <template v-if="selectedApp">
          <span class="text-text-muted">/</span>
          <span class="text-heading-sm font-semibold text-text-primary">
            {{ selectedApp.appName }}
          </span>
        </template>
      </div>

      <div class="flex-1" />

      <!-- Namespace badge -->
      <span class="badge badge-unknown text-caption hidden sm:inline-flex">
        <LayoutGrid :size="11" />
        {{ nsLabel }}
      </span>

      <!-- Back button (graph mode only) -->
      <button v-if="selectedApp" class="btn-secondary btn-sm gap-xs" @click="selectedApp = null">
        <ChevronLeft :size="13" />
        All Apps
      </button>

      <!-- Focus mode toggle (graph mode only) -->
      <button
        v-if="selectedApp"
        class="btn-secondary btn-sm"
        :class="{ 'border-brand text-brand': focusMode }"
        title="Focus mode — show only connected nodes"
        @click="focusMode = !focusMode"
      >
        <Focus :size="13" />
        <span class="hidden md:inline">Focus</span>
      </button>

      <!-- Fit view (graph mode only) -->
      <button v-if="selectedApp" class="btn-ghost btn-sm" title="Fit view" @click="fitGraph">
        <Maximize2 :size="14" />
      </button>

      <!-- Refresh -->
      <button class="btn-ghost btn-sm" :disabled="loading" title="Refresh" @click="fetchAll">
        <RefreshCw :size="14" :class="{ spin: loading }" />
      </button>
    </header>

    <!-- ── Body: app grid OR graph + detail panel ── -->
    <div class="flex flex-1 overflow-hidden">
      <!-- ═══ APP GRID MODE ═══ -->
      <AppGrid
        v-if="!selectedApp"
        :groups="appGroups"
        :loading="loading && !hasAnyData"
        class="flex-1"
        @drill-in="onDrillIn"
      />

      <!-- ══ GRAPH MODE ══ -->
      <template v-else>
        <!-- ── Legend sidebar ── -->
        <div
          class="flex-shrink-0 border-r border-border bg-bg-surface flex flex-col gap-xs px-sm py-md overflow-y-auto"
          style="width: 120px; min-width: 120px"
        >
          <p class="text-caption text-text-muted uppercase tracking-wider font-medium mb-xs">
            Resources
          </p>
          <div v-for="l in LAYERS" :key="l.kind" class="flex items-center gap-xs">
            <span
              class="w-[8px] h-[8px] rounded-sm flex-shrink-0"
              :style="{ background: l.color }"
            />
            <span class="text-caption text-text-secondary truncate">{{ l.label }}</span>
          </div>

          <div class="mt-sm pt-sm border-t border-border">
            <p class="text-caption text-text-muted uppercase tracking-wider font-medium mb-xs">
              Edges
            </p>
            <div class="flex items-center gap-xs mb-xs">
              <span
                class="flex-shrink-0"
                style="width: 18px; height: 0; border-top: 2px solid var(--color-border-strong)"
              ></span>
              <span class="text-caption text-text-secondary">Flow</span>
            </div>
            <div class="flex items-center gap-xs mb-xs">
              <span
                class="flex-shrink-0"
                style="width: 18px; height: 0; border-top: 2px dashed #9ca3af"
              ></span>
              <span class="text-caption text-text-secondary">Config/Vol</span>
            </div>
            <div class="flex items-center gap-xs">
              <span
                class="flex-shrink-0"
                style="width: 18px; height: 0; border-top: 2px dashed #f97316"
              ></span>
              <span class="text-caption text-text-secondary">External</span>
            </div>
          </div>

          <div class="mt-sm pt-sm border-t border-border">
            <p class="text-caption text-text-muted uppercase tracking-wider font-medium mb-xs">
              Status
            </p>
            <div v-for="s in STATUS_LEGEND" :key="s.label" class="flex items-center gap-xs">
              <span
                class="w-[8px] h-[8px] rounded-full flex-shrink-0"
                :style="{ background: s.color }"
              />
              <span class="text-caption text-text-secondary">{{ s.label }}</span>
            </div>
          </div>
        </div>

        <!-- ── Vue Flow canvas ── -->
        <div ref="flowWrap" class="flex-1 relative overflow-hidden">
          <!-- Empty / loading state -->
          <div
            v-if="graphDrillLoading && !graphNodes.length"
            class="absolute inset-0 flex items-center justify-center z-10"
          >
            <Spinner height="72px" />
          </div>
          <div
            v-else-if="!loading && !graphNodes.length"
            class="absolute inset-0 flex items-center justify-center z-10"
          >
            <EmptyState
              type="empty"
              message="No resources found in this namespace."
              height="120px"
            />
          </div>

          <VueFlow
            v-if="graphNodes.length"
            :nodes="displayNodes"
            :edges="displayEdges"
            :node-types="nodeTypes"
            :fit-view-on-init="true"
            :default-zoom="1"
            :min-zoom="0.2"
            :max-zoom="2"
            :edges-updatable="false"
            :nodes-connectable="false"
            :delete-key-code="null"
            class="graph-canvas"
            @node-click="onNodeClick"
            @pane-click="onPaneClick"
            @init="onFlowInit"
          >
            <Background
              :variant="BackgroundVariant.Dots"
              :gap="20"
              :size="1.5"
              :color="bgDotColor"
            />
            <Controls :show-interactive="false" class="graph-controls" />
          </VueFlow>
        </div>

        <!-- ── Detail panel ── -->
        <transition name="slide-panel">
          <div
            v-if="selectedNode"
            class="flex-shrink-0 border-l border-border bg-bg-surface flex flex-col overflow-hidden"
            style="width: 320px"
          >
            <!-- Panel header -->
            <div
              class="flex items-center justify-between px-md py-sm border-b border-border flex-shrink-0"
            >
              <div class="flex items-center gap-sm min-w-0">
                <img :src="selectedNode.data.icon" width="16" height="16" draggable="false" />
                <span class="text-label font-semibold text-text-primary truncate">
                  {{ selectedNode.data.label }}
                </span>
              </div>
              <button class="btn-ghost p-xs" @click="onPaneClick">
                <X :size="14" />
              </button>
            </div>

            <!-- Panel tabs -->
            <div class="flex border-b border-border flex-shrink-0">
              <button
                v-for="tab in panelTabs"
                :key="tab"
                class="px-md py-sm text-body-sm font-medium transition-colors flex-1 text-center"
                :class="
                  activeTab === tab
                    ? 'text-brand border-b-2 border-brand bg-bg-base'
                    : 'text-text-muted hover:text-text-secondary'
                "
                @click="activeTab = tab"
              >
                {{ tab }}
              </button>
            </div>

            <!-- Panel content -->
            <div class="flex-1 overflow-y-auto p-md">
              <!-- Info tab -->
              <template v-if="activeTab === 'Info'">
                <div class="space-y-sm">
                  <div class="flex justify-between items-baseline">
                    <span class="text-caption text-text-muted uppercase tracking-wider">Kind</span>
                    <span class="text-body-sm text-text-primary font-medium capitalize">
                      {{ selectedNode.data.resourceKind }}
                    </span>
                  </div>
                  <div class="flex justify-between items-baseline">
                    <span class="text-caption text-text-muted uppercase tracking-wider">Name</span>
                    <span
                      class="text-body-sm text-text-primary font-mono truncate max-w-[180px]"
                      :title="selectedNode.data.label"
                    >
                      {{ selectedNode.data.label }}
                    </span>
                  </div>
                  <div class="flex justify-between items-baseline">
                    <span class="text-caption text-text-muted uppercase tracking-wider">
                      Namespace
                    </span>
                    <span class="text-body-sm text-text-primary">
                      {{ selectedNode.data.namespace }}
                    </span>
                  </div>
                  <div class="flex justify-between items-baseline">
                    <span class="text-caption text-text-muted uppercase tracking-wider">
                      Status
                    </span>
                    <span
                      class="text-body-sm font-medium"
                      :style="{ color: statusColor(selectedNode.data.status) }"
                    >
                      {{ selectedNode.data.status }}
                    </span>
                  </div>

                  <!-- Connected nodes summary -->
                  <div class="pt-sm border-t border-border">
                    <p class="text-caption text-text-muted uppercase tracking-wider mb-sm">
                      Connected to
                    </p>
                    <div v-if="connectedNodes.length" class="space-y-xs">
                      <div
                        v-for="cn in connectedNodes"
                        :key="cn.id"
                        class="flex items-center gap-xs p-xs rounded cursor-pointer hover:bg-bg-elevated transition-colors"
                        @click="selectNodeById(cn.id)"
                      >
                        <img :src="cn.data.icon" width="12" height="12" draggable="false" />
                        <span class="text-body-sm text-text-secondary truncate flex-1 font-mono">
                          {{ cn.data.label }}
                        </span>
                        <span class="text-caption" :style="{ color: statusColor(cn.data.status) }">
                          {{ cn.data.status }}
                        </span>
                      </div>
                    </div>
                    <p v-else class="text-body-sm text-text-muted">No direct connections.</p>
                  </div>
                </div>
              </template>

              <!-- YAML tab -->
              <template v-else-if="activeTab === 'YAML'">
                <div class="relative">
                  <button
                    class="absolute top-xs right-xs btn-ghost btn-sm z-10"
                    title="Copy YAML"
                    @click="copyYaml"
                  >
                    <Check v-if="copied" :size="12" class="text-brand" />
                    <Copy v-else :size="12" />
                  </button>
                  <pre
                    class="code-block text-mono overflow-x-auto"
                    style="font-size: 11px; max-height: 480px"
                    >{{ selectedYaml }}</pre
                  >
                </div>
              </template>

              <!-- Logs tab (pods only) -->
              <template v-else-if="activeTab === 'Logs'">
                <div
                  v-if="selectedNode.data.resourceKind !== 'pod'"
                  class="text-body-sm text-text-muted"
                >
                  Logs are only available for Pods.
                </div>
                <template v-else>
                  <div class="flex items-center gap-sm mb-sm">
                    <select v-model="logContainer" class="input text-body-sm py-xs flex-1">
                      <option v-for="c in podContainers" :key="c" :value="c">{{ c }}</option>
                    </select>
                    <button class="btn-ghost btn-sm" title="Refresh logs" @click="loadLogs">
                      <RefreshCw :size="12" :class="{ spin: logsLoading }" />
                    </button>
                  </div>
                  <div v-if="logsLoading" class="flex justify-center py-lg">
                    <Spinner height="40px" />
                  </div>
                  <pre
                    v-else
                    class="code-block text-mono overflow-x-auto"
                    style="font-size: 10px; max-height: 420px; white-space: pre-wrap"
                    >{{ logText || 'No log output.' }}</pre
                  >
                </template>
              </template>
            </div>

            <!-- Navigate to resource list -->
            <div class="flex-shrink-0 px-md py-sm border-t border-border">
              <button
                class="btn-secondary w-full text-body-sm gap-xs"
                @click="
                  $emit(
                    'select-resource',
                    selectedNode.data.resource._kind ?? selectedNode.data.resourceKind + 's',
                  )
                "
              >
                <ArrowUpRight :size="13" />
                Open in Resource View
              </button>
            </div>
          </div>
        </transition>
      </template>
      <!-- end GRAPH MODE -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, markRaw, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background, BackgroundVariant } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import {
  RefreshCw,
  GitFork,
  LayoutGrid,
  Focus,
  Maximize2,
  X,
  Copy,
  Check,
  ArrowUpRight,
  ChevronLeft,
} from 'lucide-vue-next'
import jsYaml from 'js-yaml'
import { useResourceStore } from '../../stores/resources'
import { useNamespaceStore, ALL_NAMESPACES } from '../../stores/namespaces'
import { useUiStore } from '../../stores/ui'
import { useConnectionStore } from '../../stores/connection'
import {
  buildHelmAppGroups,
  buildHelmGraph,
  extractExternalRefs,
} from '../../composables/useGraphTransformer'
import { fetchByLabelSelector, fetchSingleResource } from '../../api/k8s'
import K8sGraphNode from './K8sGraphNode.vue'
import AppGroupNode from './AppGroupNode.vue'
import AppGrid from './AppGrid.vue'
import Spinner from '../ui/Spinner.vue'
import EmptyState from '../ui/EmptyState.vue'

// Import Vue Flow styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

defineEmits(['select-resource'])

const resourceStore = useResourceStore()
const nsStore = useNamespaceStore()
const uiStore = useUiStore()
const connStore = useConnectionStore()

// ── Node type registration ─────────────────────────────────────────────────
const nodeTypes = markRaw({ k8sNode: K8sGraphNode, appGroup: AppGroupNode })

// ── Vue Flow API ───────────────────────────────────────────────────────────
const { fitView } = useVueFlow()
const flowInstance = ref(null)

function onFlowInit(instance) {
  flowInstance.value = instance
}

function fitGraph() {
  fitView({ padding: 0.12, duration: 400 })
}

// ── Namespace ──────────────────────────────────────────────────────────────
const nsLabel = computed(() =>
  nsStore.selectedNamespace === ALL_NAMESPACES ? 'All Namespaces' : nsStore.selectedNamespace,
)

// ── Theme-aware dot color ──────────────────────────────────────────────────
const bgDotColor = computed(() => (uiStore.theme === 'dark' ? '#2d3148' : '#d1d5db'))

// ── Legend data ────────────────────────────────────────────────────────────
const LAYERS = [
  { kind: 'ingress', label: 'Ingress', color: '#a78bfa' },
  { kind: 'service', label: 'Service', color: '#60a5fa' },
  { kind: 'deployment', label: 'Deployment', color: '#4ade80' },
  { kind: 'statefulset', label: 'StatefulSet', color: '#34d399' },
  { kind: 'replicaset', label: 'ReplicaSet', color: '#86efac' },
  { kind: 'pod', label: 'Pod', color: '#fbbf24' },
  { kind: 'serviceaccount', label: 'ServiceAcct', color: '#818cf8' },
  { kind: 'configmap', label: 'ConfigMap', color: '#2dd4bf' },
  { kind: 'secret', label: 'Secret', color: '#f472b6' },
  { kind: 'persistentvolumeclaim', label: 'PVC', color: '#fb923c' },
  { kind: 'persistentvolume', label: 'PV', color: '#f97316' },
]

const STATUS_LEGEND = [
  { label: 'Running', color: '#16a34a' },
  { label: 'Pending', color: '#d97706' },
  { label: 'Failed', color: '#dc2626' },
  { label: 'Unknown', color: '#6b7280' },
]

// ── Fetch (for grid view health + helm releases list) ──────────────────────
const FETCH_TARGETS = ['pods', 'deployments', 'services', 'ingresses', 'helm-releases']
const loading = computed(() => FETCH_TARGETS.some((k) => resourceStore.cache[k]?.loading))

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

// ── AppGrid data (from Helm releases + pod health) ─────────────────────────
const helmReleases = computed(() => resourceStore.cache['helm-releases']?.items ?? [])
const allPods = computed(() => resourceStore.cache['pods']?.items ?? [])
const allDeploys = computed(() => resourceStore.cache['deployments']?.items ?? [])
const allSvcs = computed(() => resourceStore.cache['services']?.items ?? [])
const allIngs = computed(() => resourceStore.cache['ingresses']?.items ?? [])

const appGroups = computed(() =>
  buildHelmAppGroups(
    helmReleases.value,
    allPods.value,
    allDeploys.value,
    allSvcs.value,
    allIngs.value,
  ),
)
const hasAnyData = computed(() => (resourceStore.cache['helm-releases']?.items?.length ?? 0) > 0)

// ── Drill-in: fetch Helm-owned + external resources, build graph ────────────
const selectedApp = ref(null)
const graphDrillLoading = ref(false)
const graphResult = ref({ nodes: [], edges: [] })

const SECRET_NOISE = new Set(['kubernetes.io/service-account-token', 'helm.sh/release.v1'])

async function onDrillIn(app) {
  selectedApp.value = app
  selectedNodeId.value = null
  focusMode.value = false
  graphDrillLoading.value = true
  graphResult.value = { nodes: [], edges: [] }

  try {
    const base = connStore.baseUrl
    const ns = app.releaseNamespace
    const sel = `app.kubernetes.io/instance=${app.releaseName}`

    // 1. Fetch all Helm-owned resource types in parallel
    const [
      pods,
      deployments,
      statefulsets,
      replicasets,
      services,
      ingresses,
      configmaps,
      secrets,
      pvcs,
      serviceaccounts,
    ] = await Promise.all([
      fetchByLabelSelector(base, 'v1', 'pods', ns, sel),
      fetchByLabelSelector(base, 'apps/v1', 'deployments', ns, sel),
      fetchByLabelSelector(base, 'apps/v1', 'statefulsets', ns, sel),
      fetchByLabelSelector(base, 'apps/v1', 'replicasets', ns, sel),
      fetchByLabelSelector(base, 'v1', 'services', ns, sel),
      fetchByLabelSelector(base, 'networking.k8s.io/v1', 'ingresses', ns, sel),
      fetchByLabelSelector(base, 'v1', 'configmaps', ns, sel),
      fetchByLabelSelector(base, 'v1', 'secrets', ns, sel),
      fetchByLabelSelector(base, 'v1', 'persistentvolumeclaims', ns, sel),
      fetchByLabelSelector(base, 'v1', 'serviceaccounts', ns, sel),
    ])

    const cleanSecrets = secrets.filter((s) => !SECRET_NOISE.has(s.raw?.type ?? ''))
    const helmResources = {
      pods,
      deployments,
      statefulsets,
      replicasets,
      services,
      ingresses,
      configmaps,
      secrets: cleanSecrets,
      pvcs,
      serviceaccounts,
    }

    // 2. Extract external references from pod templates
    const extRefs = extractExternalRefs(helmResources)

    const ownedSet = {
      secrets: new Set(cleanSecrets.map((r) => r.name)),
      configmaps: new Set(configmaps.map((r) => r.name)),
      pvcs: new Set(pvcs.map((r) => r.name)),
      serviceaccounts: new Set(serviceaccounts.map((r) => r.name)),
    }

    async function fetchExt(apiGroup, plural, items, ownedKey) {
      const toFetch = items.filter(({ name }) => !ownedSet[ownedKey]?.has(name))
      return (
        await Promise.all(
          toFetch.map(({ name, ns: iNs }) =>
            fetchSingleResource(base, apiGroup, plural, iNs ?? ns, name),
          ),
        )
      ).filter(Boolean)
    }

    // 3. Fetch external resources in parallel
    const [extSecrets, extCMs, extSAs, extPVCs] = await Promise.all([
      fetchExt('v1', 'secrets', extRefs.secrets, 'secrets'),
      fetchExt('v1', 'configmaps', extRefs.configmaps, 'configmaps'),
      fetchExt('v1', 'serviceaccounts', extRefs.serviceaccounts, 'serviceaccounts'),
      fetchExt('v1', 'persistentvolumeclaims', extRefs.pvcs, 'pvcs'),
    ])

    // 4. Cascade: fetch PVs bound to external PVCs
    const extPVs = (
      await Promise.all(
        extPVCs
          .filter((pvc) => pvc.raw?.spec?.volumeName)
          .map((pvc) =>
            fetchSingleResource(base, 'v1', 'persistentvolumes', null, pvc.raw.spec.volumeName),
          ),
      )
    ).filter(Boolean)

    // 5. Build graph
    graphResult.value = buildHelmGraph({
      helmResources,
      externalResources: {
        secrets: extSecrets,
        configmaps: extCMs,
        serviceaccounts: extSAs,
        pvcs: extPVCs,
        pvs: extPVs,
      },
      releaseName: app.releaseName,
      releaseNs: ns,
    })
  } catch (err) {
    console.error('[ResourceGraph] drill-in error:', err)
  } finally {
    graphDrillLoading.value = false
  }
}

const graphNodes = computed(() => graphResult.value.nodes)
const graphEdges = computed(() => graphResult.value.edges)

// ── Selected node ──────────────────────────────────────────────────────────
const selectedNodeId = ref(null)
const selectedNode = computed(
  () => graphNodes.value.find((n) => n.id === selectedNodeId.value) ?? null,
)

function onNodeClick({ node }) {
  // Don't open detail panel for group container nodes
  if (node.type === 'appGroup') return
  selectedNodeId.value = node.id
  activeTab.value = 'Info'
  logText.value = ''
}

function onPaneClick() {
  selectedNodeId.value = null
  if (focusMode.value) focusMode.value = false
}

function selectNodeById(id) {
  selectedNodeId.value = id
  activeTab.value = 'Info'
}

// ── Connected nodes list ───────────────────────────────────────────────────
const connectedNodes = computed(() => {
  if (!selectedNodeId.value) return []
  const ids = new Set()
  for (const e of graphEdges.value) {
    if (e.source === selectedNodeId.value) ids.add(e.target)
    if (e.target === selectedNodeId.value) ids.add(e.source)
  }
  return graphNodes.value.filter((n) => ids.has(n.id))
})

// ── Focus mode ─────────────────────────────────────────────────────────────
const focusMode = ref(false)

const focusSet = computed(() => {
  if (!focusMode.value || !selectedNodeId.value) return null
  const ids = new Set([selectedNodeId.value])
  for (const e of graphEdges.value) {
    if (e.source === selectedNodeId.value || e.target === selectedNodeId.value) {
      ids.add(e.source)
      ids.add(e.target)
    }
  }
  return ids
})

// ── Display nodes/edges (with focus fading + selection highlight) ──────────
const displayNodes = computed(() =>
  graphNodes.value.map((n) => {
    const isGroup = n.type === 'appGroup'
    return {
      ...n,
      selected: n.id === selectedNodeId.value,
      data: isGroup
        ? n.data
        : {
            ...n.data,
            faded: focusSet.value ? !focusSet.value.has(n.id) : false,
          },
    }
  }),
)

const displayEdges = computed(() => {
  if (!focusSet.value) return graphEdges.value
  return graphEdges.value.filter(
    (e) => focusSet.value.has(e.source) && focusSet.value.has(e.target),
  )
})

// ── Fit view when graph data changes ──────────────────────────────────────
watch(graphNodes, async () => {
  await nextTick()
  fitGraph()
})

// ── Detail panel ───────────────────────────────────────────────────────────
const activeTab = ref('Info')

const panelTabs = computed(() => {
  const base = ['Info', 'YAML']
  if (selectedNode.value?.data.resourceKind === 'pod') base.push('Logs')
  return base
})

// ── YAML tab ───────────────────────────────────────────────────────────────
const selectedYaml = computed(() => {
  if (!selectedNode.value?.data.raw) return '# No data'
  try {
    return jsYaml.dump(selectedNode.value.data.raw, { indent: 2 })
  } catch {
    return JSON.stringify(selectedNode.value.data.raw, null, 2)
  }
})

const copied = ref(false)
async function copyYaml() {
  await navigator.clipboard.writeText(selectedYaml.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}

// ── Logs tab ───────────────────────────────────────────────────────────────
const logText = ref('')
const logsLoading = ref(false)
const logContainer = ref('')

const podContainers = computed(() => {
  const containers = selectedNode.value?.data?.raw?.spec?.containers ?? []
  return containers.map((c) => c.name)
})

watch(selectedNode, (node) => {
  logText.value = ''
  if (node?.data.resourceKind === 'pod') {
    logContainer.value = podContainers.value[0] ?? ''
  }
})

watch(logContainer, () => {
  if (activeTab.value === 'Logs') loadLogs()
})

async function loadLogs() {
  if (!selectedNode.value || selectedNode.value.data.resourceKind !== 'pod') return
  const pod = selectedNode.value.data.raw
  const name = pod?.metadata?.name
  const ns = pod?.metadata?.namespace ?? 'default'
  const cont = logContainer.value
  if (!name) return

  logsLoading.value = true
  logText.value = ''
  try {
    const qs = cont ? `?container=${encodeURIComponent(cont)}&tailLines=200` : '?tailLines=200'
    const path = `/api/v1/namespaces/${encodeURIComponent(ns)}/pods/${encodeURIComponent(name)}/log${qs}`
    const resp = await fetch(`${connStore.baseUrl}${path}`)
    logText.value = resp.ok ? await resp.text() : `Error ${resp.status}: ${resp.statusText}`
  } catch (err) {
    logText.value = `Error: ${err.message}`
  } finally {
    logsLoading.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'Logs' && !logText.value) loadLogs()
})

// ── Status colour helper ───────────────────────────────────────────────────
const STATUS_COLORS_MAP = {
  Running: 'var(--color-status-running)',
  Available: 'var(--color-status-running)',
  Succeeded: 'var(--color-status-running)',
  Pending: 'var(--color-status-pending)',
  Progressing: 'var(--color-status-pending)',
  Failed: 'var(--color-status-failed)',
  CrashLoopBackOff: 'var(--color-status-failed)',
  OOMKilled: 'var(--color-status-failed)',
  Degraded: 'var(--color-status-warning)',
  Terminating: 'var(--color-status-warning)',
}

function statusColor(status) {
  return STATUS_COLORS_MAP[status] ?? 'var(--color-status-unknown)'
}
</script>

<style>
/* Override Vue Flow defaults to match tether design tokens */
.graph-canvas {
  background: var(--color-bg-base) !important;
}

/* Main flow edges */
.vue-flow__edge-path {
  stroke: var(--color-border-strong) !important;
  stroke-width: 1.5 !important;
}

.vue-flow__edge.selected .vue-flow__edge-path,
.vue-flow__edge:hover .vue-flow__edge-path {
  stroke: var(--color-brand-muted) !important;
  stroke-width: 2 !important;
}

/* Dashed edges (config/secret/storage refs) */
.vue-flow__edge path[style*='stroke-dasharray'] {
  stroke: color-mix(in srgb, var(--color-text-muted) 60%, transparent) !important;
}

.vue-flow__edge-label {
  font-size: 9px;
  fill: var(--color-text-muted);
}

.vue-flow__arrowhead path {
  fill: var(--color-border-strong) !important;
}

/* Group node: remove Vue Flow's own selection outline — AppGroupNode handles it */
.vue-flow__node-appGroup {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  z-index: 0 !important;
  isolation: auto !important;
}

/* Edges must render above group nodes so cross-boundary arrows are visible */
.vue-flow__edges {
  z-index: 1000 !important;
  pointer-events: none;
}
/* Re-enable pointer events per-edge (hover/click still works) */
.vue-flow__edge {
  pointer-events: visibleStroke;
}

.vue-flow__controls {
  bottom: 12px;
  left: 12px;
  top: auto;
  box-shadow: var(--shadow-surface);
}

.vue-flow__controls-button {
  background: var(--color-bg-surface) !important;
  border: 1px solid var(--color-border) !important;
  color: var(--color-text-secondary) !important;
  fill: var(--color-text-secondary) !important;
  width: 28px !important;
  height: 28px !important;
}

.vue-flow__controls-button:hover {
  background: var(--color-bg-elevated) !important;
}

.vue-flow__minimap {
  background: var(--color-bg-surface) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-lg) !important;
}
</style>

<style scoped>
/* Slide-in panel transition */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.slide-panel-enter-from,
.slide-panel-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.graph-shell {
  isolation: isolate;
}
</style>
