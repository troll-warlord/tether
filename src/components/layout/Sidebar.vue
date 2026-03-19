<template>
  <nav
    class="flex flex-col h-full overflow-hidden transition-all duration-base"
    :style="{
      width: collapsed ? '52px' : customWidth ? customWidth + 'px' : 'var(--sidebar-width)',
    }"
    style="background: var(--color-sidebar-bg); border-right: 1px solid var(--color-sidebar-border)"
  >
    <!-- Logo / Brand -->
    <div
      class="flex items-center h-[var(--header-height)] flex-shrink-0 px-sm"
      :class="collapsed ? 'justify-center' : 'justify-between'"
      style="border-bottom: 1px solid var(--color-sidebar-border)"
    >
      <div class="flex items-center gap-sm overflow-hidden">
        <div class="w-7 h-7 rounded-md bg-brand flex items-center justify-center flex-shrink-0">
          <Anchor :size="14" class="text-white" />
        </div>
        <span v-if="!collapsed" class="text-heading-sm font-bold text-white truncate">tether</span>
      </div>
      <button v-if="!collapsed" class="btn-ghost btn-sm p-xs" @click="$emit('toggle-collapse')">
        <PanelLeftClose :size="16" style="color: var(--color-sidebar-text-muted)" />
      </button>
    </div>

    <!-- Namespace Selector -->
    <div
      v-if="!collapsed"
      class="px-sm py-sm flex-shrink-0"
      style="border-bottom: 1px solid var(--color-sidebar-border)"
    >
      <SelectDropdown
        :model-value="selectedNamespace"
        :options="namespaceOptions"
        @update:model-value="nsStore.selectNamespace($event)"
      />
    </div>

    <!-- Nav groups -->
    <div class="flex-1 overflow-y-auto py-sm px-xs">
      <!-- Dashboard / Overview shortcut -->
      <button
        class="nav-item w-full"
        :class="{
          active: selectedResourceType === null && activeView === 'dashboard',
          'justify-center': collapsed,
        }"
        :title="collapsed ? 'Overview' : undefined"
        @click="$emit('select-dashboard')"
      >
        <LayoutDashboard :size="16" class="flex-shrink-0" />
        <span v-if="!collapsed">Overview</span>
      </button>
      <!-- Graph shortcut -->
      <button
        class="nav-item w-full mb-xs"
        :class="{ active: activeView === 'graph', 'justify-center': collapsed }"
        :title="collapsed ? 'Dependency Graph' : undefined"
        @click="$emit('select-graph')"
      >
        <GitFork :size="16" class="flex-shrink-0" />
        <span v-if="!collapsed">Applications</span>
      </button>
      <div class="divider my-xs" />

      <template v-for="group in RESOURCE_GROUPS" :key="group.id">
        <!-- Collapsible group header (expanded sidebar only) -->
        <button
          v-if="!collapsed"
          class="nav-group-label w-full flex items-center justify-between pr-xs cursor-pointer select-none hover:opacity-80 transition-opacity"
          @click.stop="toggleGroup(group.id)"
        >
          <div class="flex items-center gap-xs">
            <component :is="groupIcon(group.id)" :size="11" class="opacity-60 flex-shrink-0" />
            {{ group.label }}
          </div>
          <ChevronDown
            :size="11"
            class="flex-shrink-0 opacity-50 transition-transform duration-150"
            :class="expandedGroups[group.id] ? 'rotate-0' : '-rotate-90'"
          />
        </button>
        <!-- close the groupIcon div -->
        <div v-else class="divider my-xs opacity-30" />

        <button
          v-for="res in group.resources"
          v-show="collapsed || expandedGroups[group.id]"
          :key="res.id"
          class="nav-item w-full"
          :class="{ active: selectedResourceType === res.id, 'justify-center': collapsed }"
          :title="collapsed ? res.label : undefined"
          @click="$emit('select-resource', res.id)"
        >
          <component :is="resourceIcon(res.id)" :size="16" class="flex-shrink-0" />
          <span v-if="!collapsed" class="truncate">{{ res.label }}</span>
        </button>
      </template>
    </div>

    <!-- Bottom actions -->
    <div
      class="flex-shrink-0 px-xs py-sm"
      style="border-top: 1px solid var(--color-sidebar-border)"
    >
      <button
        v-if="collapsed"
        class="nav-item w-full justify-center"
        title="Expand sidebar"
        @click="$emit('toggle-collapse')"
      >
        <PanelLeftOpen :size="16" />
      </button>
      <button
        class="nav-item w-full"
        :class="{ 'justify-center': collapsed }"
        title="Settings"
        @click="$emit('open-settings')"
      >
        <Settings :size="16" class="flex-shrink-0" />
        <span v-if="!collapsed">Settings</span>
      </button>
      <button
        class="nav-item w-full"
        :class="{ 'justify-center': collapsed }"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="uiStore.toggleTheme()"
      >
        <Sun v-if="isDark" :size="16" class="flex-shrink-0" />
        <Moon v-else :size="16" class="flex-shrink-0" />
        <span v-if="!collapsed">{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  Anchor,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  Layers,
  Network,
  Database,
  SlidersHorizontal,
  ShieldCheck,
  Package,
  LayoutDashboard,
  GitFork,
  Globe,
} from 'lucide-vue-next'
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
  K8sHPA,
  K8sPDB,
  K8sNamespace,
  K8sNode,
  K8sEvent,
} from '../ui/K8sIcons.js'
import { useUiStore } from '../../stores/ui'
import { useNamespaceStore } from '../../stores/namespaces'
import { RESOURCE_GROUPS } from '../../stores/resources'
import SelectDropdown from '../ui/SelectDropdown.vue'

const props = defineProps({
  collapsed: { type: Boolean, default: false },
  selectedResourceType: { type: String, default: null },
  customWidth: { type: Number, default: null },
  activeView: { type: String, default: 'dashboard' }, // 'dashboard' | 'graph' | 'resource'
})
defineEmits([
  'toggle-collapse',
  'select-resource',
  'select-dashboard',
  'select-graph',
  'open-settings',
])

// Track which groups are expanded — all closed by default
const expandedGroups = ref(Object.fromEntries(RESOURCE_GROUPS.map((g) => [g.id, false])))
function toggleGroup(id) {
  expandedGroups.value[id] = !expandedGroups.value[id]
}

// Auto-expand the group that contains the currently selected resource type
watch(
  () => props.selectedResourceType,
  (id) => {
    if (!id) return
    for (const g of RESOURCE_GROUPS) {
      if (g.resources.some((r) => r.id === id)) {
        expandedGroups.value[g.id] = true
        break
      }
    }
  },
  { immediate: true },
)

const groupIconMap = {
  workloads: Layers,
  network: Network,
  storage: Database,
  configuration: SlidersHorizontal,
  access: ShieldCheck,
  cluster: Globe,
  helm: Package,
}
function groupIcon(id) {
  return groupIconMap[id] ?? Layers
}

const uiStore = useUiStore()
const nsStore = useNamespaceStore()
const selectedNamespace = computed(() => nsStore.selectedNamespace)
const namespaceOptions = computed(() => nsStore.namespaceOptions)
const isDark = computed(() => uiStore.theme === 'dark')

const iconMap = {
  pods: K8sPod,
  deployments: K8sDeployment,
  statefulsets: K8sStatefulSet,
  daemonsets: K8sDaemonSet,
  replicasets: K8sReplicaSet,
  jobs: K8sJob,
  cronjobs: K8sCronJob,
  horizontalpodautoscalers: K8sHPA,
  poddisruptionbudgets: K8sPDB,
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
  namespaces: K8sNamespace,
  nodes: K8sNode,
  events: K8sEvent,
  'helm-releases': K8sHelm,
}

function resourceIcon(id) {
  return iconMap[id] ?? K8sPod
}
</script>
