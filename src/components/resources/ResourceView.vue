<template>
  <div class="flex flex-col h-full">
    <TopBar
      :title="resourceDef?.label || 'Resources'"
      :resource-type="resourceType"
      :count="displayItems.length"
      :loading="cacheEntry?.loading"
      v-model:show-all-revisions="showAllRevisions"
      @refresh="resourceStore.fetchResource(resourceType)"
    />

    <div class="flex flex-1 overflow-hidden">
      <!-- Main resource table -->
      <main class="flex-1 overflow-hidden">
        <ResourceTable
          :items="displayItems"
          :loading="cacheEntry?.loading"
          :error="cacheEntry?.error"
          :selected-uid="resourceStore.selectedResource?.uid"
          :show-namespace="selectedNamespace === ALL_NAMESPACES"
          :extra-columns="extraColumns"
          @select="onSelect"
        />
      </main>

      <!-- Details panel resize handle -->
      <div
        v-if="uiStore.detailsPanelOpen && resourceStore.selectedResource"
        class="w-[3px] flex-shrink-0 cursor-col-resize transition-colors duration-100 z-10"
        style="background: var(--color-border)"
        @mousedown="startDetailsResize"
        @mouseenter="(e) => (e.currentTarget.style.background = 'var(--color-brand)')"
        @mouseleave="(e) => (e.currentTarget.style.background = 'var(--color-border)')"
      />

      <!-- Details panel (slide in from right) -->
      <Transition name="slide-right">
        <DetailsPanel
          v-if="uiStore.detailsPanelOpen && resourceStore.selectedResource"
          v-model="uiStore.detailsPanelOpen"
          :resource="resourceStore.selectedResource"
          :panel-width="detailsWidth"
        />
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import TopBar from '../layout/TopBar.vue'
import ResourceTable from './ResourceTable.vue'
import DetailsPanel from './DetailsPanel.vue'
import { useResourceStore } from '../../stores/resources'
import { useNamespaceStore, ALL_NAMESPACES } from '../../stores/namespaces'
import { useUiStore } from '../../stores/ui'
import { useFilteredResources } from '../../composables/useFilteredResources'
import { useResources } from '../../composables/useResources'
import { formatAge } from '../../composables/useFormatters'

const props = defineProps({
  resourceType: { type: String, required: true },
})

const resourceStore = useResourceStore()
const nsStore = useNamespaceStore()
const uiStore = useUiStore()
const selectedNamespace = computed(() => nsStore.selectedNamespace)

// Show all revisions toggle (helm-releases view only)
const showAllRevisions = ref(false)

// ── Details panel resize ───────────────────────────────────────────────
const detailsWidth = ref(420)

function startDetailsResize(e) {
  e.preventDefault()
  const startX = e.clientX
  const startW = detailsWidth.value
  function onMove(ev) {
    // dragging left increases width, dragging right decreases
    detailsWidth.value = Math.max(280, Math.min(1000, startW + startX - ev.clientX))
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// Ensure the correct resource type is selected in the store
// and close details panel on switch
watch(
  () => props.resourceType,
  (id) => {
    resourceStore.selectResourceType(id)
    uiStore.closeDetailsPanel()
    showAllRevisions.value = false
  },
  { immediate: true },
)

// resourceType as computed ref so useResources watches it reactively
const resourceTypeRef = computed(() => props.resourceType)
const { start } = useResources(resourceTypeRef)

// Kick off initial fetch immediately when mounted
onMounted(() => {
  if (resourceStore.isConnected !== false) start()
})

// Data
const cacheEntry = computed(() => resourceStore.cache[props.resourceType])
const { filtered } = useFilteredResources()

// For helm-releases, hide superseded/failed by default unless showAllRevisions is on
const displayItems = computed(() => {
  if (props.resourceType !== 'helm-releases' || showAllRevisions.value) return filtered.value
  return filtered.value.filter((item) => item.status?.toLowerCase() === 'deployed')
})

// Resource definition for the current type
const resourceDef = computed(() => resourceStore.getResourceDef(props.resourceType))

// Extra columns per resource type — mirrors kubectl get output
const extraColumns = computed(() => {
  switch (props.resourceType) {
    case 'pods':
      return [
        {
          key: 'ready',
          label: 'Ready',
          value: (item) => {
            const cs = item.raw?.status?.containerStatuses ?? []
            const ready = cs.filter((c) => c.ready).length
            return `${ready}/${cs.length || (item.raw?.spec?.containers?.length ?? 0)}`
          },
        },
        {
          key: 'restarts',
          label: 'Restarts',
          value: (item) => {
            const cs = item.raw?.status?.containerStatuses ?? []
            return cs.reduce((sum, c) => sum + (c.restartCount ?? 0), 0)
          },
        },
        { key: 'ip', label: 'Pod IP', value: (item) => item.raw?.status?.podIP ?? '—' },
        { key: 'node', label: 'Node', value: (item) => item.raw?.spec?.nodeName ?? '—' },
      ]

    case 'deployments':
      return [
        {
          key: 'ready',
          label: 'Ready',
          value: (item) =>
            `${item.raw?.status?.readyReplicas ?? 0}/${item.raw?.spec?.replicas ?? 0}`,
        },
        {
          key: 'up-to-date',
          label: 'Up-to-date',
          value: (item) => item.raw?.status?.updatedReplicas ?? 0,
        },
        {
          key: 'available',
          label: 'Available',
          value: (item) => item.raw?.status?.availableReplicas ?? 0,
        },
      ]

    case 'statefulsets':
      return [
        {
          key: 'ready',
          label: 'Ready',
          value: (item) =>
            `${item.raw?.status?.readyReplicas ?? 0}/${item.raw?.spec?.replicas ?? 0}`,
        },
        { key: 'svc', label: 'Service', value: (item) => item.raw?.spec?.serviceName ?? '—' },
      ]

    case 'daemonsets':
      return [
        {
          key: 'desired',
          label: 'Desired',
          value: (item) => item.raw?.status?.desiredNumberScheduled ?? 0,
        },
        {
          key: 'current',
          label: 'Current',
          value: (item) => item.raw?.status?.currentNumberScheduled ?? 0,
        },
        { key: 'ready', label: 'Ready', value: (item) => item.raw?.status?.numberReady ?? 0 },
        {
          key: 'available',
          label: 'Available',
          value: (item) => item.raw?.status?.numberAvailable ?? 0,
        },
      ]

    case 'replicasets':
      return [
        { key: 'desired', label: 'Desired', value: (item) => item.raw?.spec?.replicas ?? 0 },
        { key: 'current', label: 'Current', value: (item) => item.raw?.status?.replicas ?? 0 },
        { key: 'ready', label: 'Ready', value: (item) => item.raw?.status?.readyReplicas ?? 0 },
      ]

    case 'jobs':
      return [
        {
          key: 'completions',
          label: 'Completions',
          value: (item) =>
            `${item.raw?.status?.succeeded ?? 0}/${item.raw?.spec?.completions ?? 1}`,
        },
        { key: 'active', label: 'Active', value: (item) => item.raw?.status?.active ?? 0 },
        { key: 'failed', label: 'Failed', value: (item) => item.raw?.status?.failed ?? 0 },
      ]

    case 'cronjobs':
      return [
        { key: 'schedule', label: 'Schedule', value: (item) => item.raw?.spec?.schedule ?? '—' },
        {
          key: 'last',
          label: 'Last Schedule',
          value: (item) =>
            item.raw?.status?.lastScheduleTime
              ? formatAge(item.raw.status.lastScheduleTime) + ' ago'
              : 'Never',
        },
        { key: 'active', label: 'Active', value: (item) => item.raw?.status?.active?.length ?? 0 },
        {
          key: 'suspend',
          label: 'Suspend',
          value: (item) => (item.raw?.spec?.suspend ? 'True' : 'False'),
        },
      ]

    case 'services':
      return [
        { key: 'type', label: 'Type', value: (item) => item.raw?.spec?.type ?? '—' },
        {
          key: 'clusterIP',
          label: 'Cluster IP',
          value: (item) => item.raw?.spec?.clusterIP ?? '—',
        },
        {
          key: 'externalIP',
          label: 'External IP',
          value: (item) => {
            const lb = item.raw?.status?.loadBalancer?.ingress ?? []
            if (lb.length) return lb.map((i) => i.ip || i.hostname).join(', ')
            const ext = item.raw?.spec?.externalIPs ?? []
            return ext.length ? ext.join(', ') : '—'
          },
        },
        {
          key: 'ports',
          label: 'Port(s)',
          value: (item) => {
            const ports = item.raw?.spec?.ports ?? []
            return (
              ports
                .map((p) => `${p.port}${p.nodePort ? ':' + p.nodePort : ''}/${p.protocol ?? 'TCP'}`)
                .join(', ') || '—'
            )
          },
        },
      ]

    case 'ingresses':
      return [
        {
          key: 'class',
          label: 'Class',
          value: (item) =>
            item.raw?.spec?.ingressClassName ??
            item.raw?.metadata?.annotations?.['kubernetes.io/ingress.class'] ??
            '—',
        },
        {
          key: 'hosts',
          label: 'Hosts',
          value: (item) => {
            const rules = item.raw?.spec?.rules ?? []
            return rules.map((r) => r.host || '*').join(', ') || '—'
          },
        },
        {
          key: 'address',
          label: 'Address',
          value: (item) => {
            const lb = item.raw?.status?.loadBalancer?.ingress ?? []
            return lb.map((i) => i.ip || i.hostname).join(', ') || '—'
          },
        },
        {
          key: 'ports',
          label: 'Ports',
          value: (item) => {
            const tls = item.raw?.spec?.tls ?? []
            return tls.length ? '80, 443' : '80'
          },
        },
      ]

    case 'networkpolicies':
      return [
        {
          key: 'pod-selector',
          label: 'Pod Selector',
          value: (item) => {
            const sel = item.raw?.spec?.podSelector?.matchLabels ?? {}
            const entries = Object.entries(sel)
            return entries.length ? entries.map(([k, v]) => `${k}=${v}`).join(', ') : '<all pods>'
          },
        },
        {
          key: 'types',
          label: 'Policy Types',
          value: (item) => (item.raw?.spec?.policyTypes ?? []).join(', ') || 'Ingress',
        },
      ]

    case 'endpoints':
      return [
        {
          key: 'addresses',
          label: 'Endpoints',
          value: (item) => {
            const subsets = item.raw?.subsets ?? []
            const addrs = subsets.flatMap((s) =>
              (s.addresses ?? []).flatMap((a) => (s.ports ?? []).map((p) => `${a.ip}:${p.port}`)),
            )
            if (!addrs.length) return '<none>'
            return addrs.slice(0, 3).join(', ') + (addrs.length > 3 ? ` +${addrs.length - 3}` : '')
          },
        },
      ]

    case 'persistentvolumes':
      return [
        {
          key: 'capacity',
          label: 'Capacity',
          value: (item) => item.raw?.spec?.capacity?.storage ?? '—',
        },
        {
          key: 'access',
          label: 'Access Modes',
          value: (item) =>
            (item.raw?.spec?.accessModes ?? [])
              .map((m) =>
                m === 'ReadWriteOnce'
                  ? 'RWO'
                  : m === 'ReadOnlyMany'
                    ? 'ROX'
                    : m === 'ReadWriteMany'
                      ? 'RWX'
                      : m,
              )
              .join(', ') || '—',
        },
        {
          key: 'reclaim',
          label: 'Reclaim',
          value: (item) => item.raw?.spec?.persistentVolumeReclaimPolicy ?? '—',
        },
        {
          key: 'storageclass',
          label: 'StorageClass',
          value: (item) => item.raw?.spec?.storageClassName ?? '—',
        },
        {
          key: 'claim',
          label: 'Claim',
          value: (item) => {
            const ref = item.raw?.spec?.claimRef
            return ref ? `${ref.namespace}/${ref.name}` : '—'
          },
        },
      ]

    case 'persistentvolumeclaims':
      return [
        { key: 'volume', label: 'Volume', value: (item) => item.raw?.spec?.volumeName ?? '—' },
        {
          key: 'capacity',
          label: 'Capacity',
          value: (item) => item.raw?.status?.capacity?.storage ?? '—',
        },
        {
          key: 'access',
          label: 'Access Modes',
          value: (item) =>
            (item.raw?.status?.accessModes ?? item.raw?.spec?.accessModes ?? [])
              .map((m) =>
                m === 'ReadWriteOnce'
                  ? 'RWO'
                  : m === 'ReadOnlyMany'
                    ? 'ROX'
                    : m === 'ReadWriteMany'
                      ? 'RWX'
                      : m,
              )
              .join(', ') || '—',
        },
        {
          key: 'storageclass',
          label: 'StorageClass',
          value: (item) => item.raw?.spec?.storageClassName ?? '—',
        },
      ]

    case 'storageclasses':
      return [
        { key: 'provisioner', label: 'Provisioner', value: (item) => item.raw?.provisioner ?? '—' },
        {
          key: 'reclaim',
          label: 'Reclaim Policy',
          value: (item) => item.raw?.reclaimPolicy ?? 'Delete',
        },
        {
          key: 'volumeBinding',
          label: 'Binding Mode',
          value: (item) => item.raw?.volumeBindingMode ?? 'Immediate',
        },
        {
          key: 'expand',
          label: 'Allow Expand',
          value: (item) => (item.raw?.allowVolumeExpansion ? 'true' : 'false'),
        },
      ]

    case 'configmaps':
      return [
        { key: 'data', label: 'Data', value: (item) => Object.keys(item.raw?.data ?? {}).length },
      ]

    case 'secrets':
      return [
        { key: 'type', label: 'Type', value: (item) => item.raw?.type ?? '—' },
        { key: 'data', label: 'Data', value: (item) => Object.keys(item.raw?.data ?? {}).length },
      ]

    case 'serviceaccounts':
      return [
        { key: 'secrets', label: 'Secrets', value: (item) => (item.raw?.secrets ?? []).length },
      ]

    case 'roles':
    case 'clusterroles':
      return [{ key: 'rules', label: 'Rules', value: (item) => (item.raw?.rules ?? []).length }]

    case 'rolebindings':
    case 'clusterrolebindings':
      return [
        {
          key: 'role',
          label: 'Role',
          value: (item) => `${item.raw?.roleRef?.kind ?? ''}/${item.raw?.roleRef?.name ?? '—'}`,
        },
        { key: 'subjects', label: 'Subjects', value: (item) => (item.raw?.subjects ?? []).length },
      ]

    case 'resourcequotas':
      return [
        {
          key: 'resources',
          label: 'Resources',
          value: (item) => Object.keys(item.raw?.spec?.hard ?? {}).length,
        },
      ]

    case 'limitranges':
      return [
        { key: 'limits', label: 'Limits', value: (item) => (item.raw?.spec?.limits ?? []).length },
      ]

    case 'helm-releases':
      return [
        { key: 'chart', label: 'Chart', value: (item) => item.chart ?? '—' },
        { key: 'version', label: 'Revision', value: (item) => item.version ?? '—' },
      ]

    case 'horizontalpodautoscalers':
      return [
        {
          key: 'reference',
          label: 'Reference',
          value: (item) =>
            `${item.raw?.spec?.scaleTargetRef?.kind ?? ''}/${item.raw?.spec?.scaleTargetRef?.name ?? '—'}`,
        },
        { key: 'min', label: 'Min', value: (item) => item.raw?.spec?.minReplicas ?? 1 },
        { key: 'max', label: 'Max', value: (item) => item.raw?.spec?.maxReplicas ?? '—' },
        {
          key: 'replicas',
          label: 'Replicas',
          value: (item) => item.raw?.status?.currentReplicas ?? 0,
        },
      ]

    case 'poddisruptionbudgets':
      return [
        {
          key: 'min-available',
          label: 'Min Available',
          value: (item) => item.raw?.spec?.minAvailable ?? '—',
        },
        {
          key: 'max-unavailable',
          label: 'Max Unavailable',
          value: (item) => item.raw?.spec?.maxUnavailable ?? '—',
        },
        {
          key: 'allowed',
          label: 'Disruptions Allowed',
          value: (item) => item.raw?.status?.disruptionsAllowed ?? 0,
        },
        {
          key: 'current',
          label: 'Current Healthy',
          value: (item) => item.raw?.status?.currentHealthy ?? 0,
        },
      ]

    case 'namespaces':
      return [
        { key: 'phase', label: 'Phase', value: (item) => item.raw?.status?.phase ?? 'Active' },
        {
          key: 'labels',
          label: 'Labels',
          value: (item) => Object.keys(item.raw?.metadata?.labels ?? {}).length,
        },
      ]

    case 'nodes':
      return [
        {
          key: 'roles',
          label: 'Roles',
          value: (item) => {
            const labels = item.raw?.metadata?.labels ?? {}
            const roles = Object.keys(labels)
              .filter((k) => k.startsWith('node-role.kubernetes.io/'))
              .map((k) => k.replace('node-role.kubernetes.io/', ''))
            return roles.length ? roles.join(', ') : '<none>'
          },
        },
        {
          key: 'version',
          label: 'Version',
          value: (item) => item.raw?.status?.nodeInfo?.kubeletVersion ?? '—',
        },
        { key: 'os', label: 'OS', value: (item) => item.raw?.status?.nodeInfo?.osImage ?? '—' },
        {
          key: 'internal-ip',
          label: 'Internal IP',
          value: (item) => {
            const addrs = item.raw?.status?.addresses ?? []
            return addrs.find((a) => a.type === 'InternalIP')?.address ?? '—'
          },
        },
      ]

    case 'events':
      return [
        { key: 'type', label: 'Type', value: (item) => item.raw?.type ?? '—' },
        { key: 'reason', label: 'Reason', value: (item) => item.raw?.reason ?? '—' },
        {
          key: 'object',
          label: 'Object',
          value: (item) => {
            const ref = item.raw?.involvedObject
            return ref ? `${ref.kind}/${ref.name}` : '—'
          },
        },
        { key: 'message', label: 'Message', value: (item) => item.raw?.message ?? '—' },
        { key: 'count', label: 'Count', value: (item) => item.raw?.count ?? 1 },
      ]

    default:
      return []
  }
})

function onSelect(item) {
  resourceStore.selectResource(item)
  uiStore.openDetailsPanel()
  uiStore.setActiveTab('yaml')
}
</script>
