<template>
  <header
    class="flex items-center justify-between flex-shrink-0 px-md border-b border-border bg-bg-surface"
    :style="{ height: 'var(--header-height)' }"
  >
    <!-- Left: icon + resource type title -->
    <div class="flex items-center gap-sm">
      <component :is="resourceIcon" v-if="resourceIcon" :size="22" />
      <h1 class="text-heading-sm font-semibold text-text-primary">{{ title }}</h1>
      <span v-if="count !== null" class="badge badge-unknown">{{ count }}</span>
    </div>

    <!-- Right: search + helm filter + namespace badge + refresh -->
    <div class="flex items-center gap-sm">
      <!-- Search -->
      <div class="relative hidden sm:block">
        <Search
          :size="14"
          class="absolute left-sm top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          class="input pl-[28px] w-48"
          placeholder="Search..."
          :value="searchQuery"
          @input="uiStore.searchQuery = $event.target.value"
        />
      </div>

      <!-- Show all revisions toggle (helm-releases view only) -->
      <button
        v-if="resourceType === 'helm-releases'"
        class="btn-ghost btn-sm flex items-center gap-xs"
        :class="{ 'text-brand': showAllRevisions }"
        :title="
          showAllRevisions
            ? 'Showing all revisions — click to show deployed only'
            : 'Showing deployed only — click to show all'
        "
        @click="$emit('update:showAllRevisions', !showAllRevisions)"
      >
        <History :size="14" />
        <span class="text-caption hidden lg:inline">
          {{ showAllRevisions ? 'All revisions' : 'Deployed only' }}
        </span>
      </button>

      <!-- Helm chart filter (all views except helm-releases) -->
      <div v-else class="relative" ref="helmDropRef">
        <!-- Active filter chip: shows release name, click to clear -->
        <button
          v-if="uiStore.helmFilter"
          class="btn-ghost btn-sm flex items-center gap-xs text-brand border border-brand rounded-md px-xs"
          title="Clear Helm chart filter"
          @click="uiStore.clearHelmFilter()"
        >
          <K8sHelm :size="13" />
          <span class="text-caption font-medium max-w-[100px] truncate">
            {{ uiStore.helmFilter }}
          </span>
          <X :size="11" />
        </button>

        <!-- Filter button when no active filter -->
        <button
          v-else
          class="btn-ghost btn-sm flex items-center gap-xs"
          :class="{ 'text-brand': helmDropOpen }"
          title="Filter all resources by Helm chart"
          @click="helmDropOpen = !helmDropOpen"
        >
          <Filter :size="14" />
        </button>

        <!-- Dropdown list of deployed releases -->
        <Transition name="fade">
          <ul
            v-if="helmDropOpen"
            class="absolute right-0 z-50 mt-xs min-w-[230px] bg-bg-elevated border border-border rounded-lg shadow-overlay overflow-auto"
            style="max-height: 240px"
          >
            <li
              v-if="!deployedReleases.length"
              class="px-sm py-sm text-caption text-text-muted leading-relaxed"
            >
              No deployed Helm releases found.
              <br />
              <span class="opacity-70">Open Helm → Releases to load them.</span>
            </li>
            <li
              v-for="r in deployedReleases"
              :key="r.uid"
              class="flex items-center gap-xs px-sm py-xs cursor-pointer hover:bg-bg-surface transition-colors"
              @click="selectHelmFilter(r.name)"
            >
              <Check
                v-if="uiStore.helmFilter === r.name"
                :size="12"
                class="text-brand flex-shrink-0"
              />
              <span v-else class="inline-block w-[12px] flex-shrink-0" />
              <span class="text-body text-text-primary flex-1 truncate">{{ r.name }}</span>
              <span class="text-caption text-text-muted truncate max-w-[90px]">{{ r.chart }}</span>
            </li>
          </ul>
        </Transition>
      </div>

      <!-- Namespace pill -->
      <span class="badge badge-unknown text-caption hidden md:inline-flex">
        <LayoutGrid :size="12" />
        {{ nsLabel }}
      </span>

      <!-- Refresh -->
      <button
        class="btn-ghost btn-sm"
        title="Refresh"
        :disabled="loading"
        @click="$emit('refresh')"
      >
        <RefreshCw :size="14" :class="{ spin: loading }" />
      </button>

      <!-- Connection status dot -->
      <div class="flex items-center gap-xs">
        <span
          class="inline-block w-[8px] h-[8px] rounded-full"
          :class="isConnected ? 'bg-status-running pulse-dot' : 'bg-status-failed'"
        />
        <span class="text-caption text-text-muted hidden lg:inline">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, RefreshCw, LayoutGrid, Filter, X, Check, History } from 'lucide-vue-next'
import {
  K8sPod,
  K8sDeployment,
  K8sStatefulSet,
  K8sDaemonSet,
  K8sReplicaSet,
  K8sJob,
  K8sCronJob,
  K8sService,
  K8sIngress,
  K8sNetworkPolicy,
  K8sEndpoints,
  K8sPV,
  K8sPVC,
  K8sStorageClass,
  K8sConfigMap,
  K8sSecret,
  K8sResourceQuota,
  K8sLimitRange,
  K8sServiceAccount,
  K8sRole,
  K8sRoleBinding,
  K8sClusterRole,
  K8sClusterRoleBinding,
  K8sHelm,
} from '../ui/K8sIcons.js'
import { useUiStore } from '../../stores/ui'
import { useConnectionStore } from '../../stores/connection'
import { useNamespaceStore, ALL_NAMESPACES } from '../../stores/namespaces'
import { useResourceStore } from '../../stores/resources'

const K8S_ICON_MAP = {
  pods: K8sPod,
  deployments: K8sDeployment,
  statefulsets: K8sStatefulSet,
  daemonsets: K8sDaemonSet,
  replicasets: K8sReplicaSet,
  jobs: K8sJob,
  cronjobs: K8sCronJob,
  services: K8sService,
  ingresses: K8sIngress,
  networkpolicies: K8sNetworkPolicy,
  endpoints: K8sEndpoints,
  persistentvolumes: K8sPV,
  persistentvolumeclaims: K8sPVC,
  storageclasses: K8sStorageClass,
  configmaps: K8sConfigMap,
  secrets: K8sSecret,
  resourcequotas: K8sResourceQuota,
  limitranges: K8sLimitRange,
  serviceaccounts: K8sServiceAccount,
  roles: K8sRole,
  rolebindings: K8sRoleBinding,
  clusterroles: K8sClusterRole,
  clusterrolebindings: K8sClusterRoleBinding,
  'helm-releases': K8sHelm,
}

const props = defineProps({
  title: { type: String, default: '' },
  resourceType: { type: String, default: null },
  count: { type: Number, default: null },
  loading: { type: Boolean, default: false },
  showAllRevisions: { type: Boolean, default: false },
})
defineEmits(['refresh', 'update:showAllRevisions'])

const uiStore = useUiStore()
const connStore = useConnectionStore()
const nsStore = useNamespaceStore()
const resourceStore = useResourceStore()

const resourceIcon = computed(() =>
  props.resourceType ? (K8S_ICON_MAP[props.resourceType] ?? null) : null,
)
const isConnected = computed(() => connStore.isConnected)
const searchQuery = computed(() => uiStore.searchQuery)
const nsLabel = computed(() =>
  nsStore.selectedNamespace === ALL_NAMESPACES ? 'All Namespaces' : nsStore.selectedNamespace,
)

// Helm chart filter dropdown
const helmDropRef = ref(null)
const helmDropOpen = ref(false)

const deployedReleases = computed(() =>
  (resourceStore.cache['helm-releases']?.items ?? []).filter(
    (r) => r.status?.toLowerCase() === 'deployed',
  ),
)

function selectHelmFilter(name) {
  uiStore.setHelmFilter(name)
  helmDropOpen.value = false
}

function onClickOutside(e) {
  if (helmDropRef.value && !helmDropRef.value.contains(e.target)) {
    helmDropOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>
