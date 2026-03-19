<template>
  <aside
    class="panel flex-shrink-0 transition-all duration-base"
    :class="{ 'translate-x-full': !modelValue }"
    :style="panelWidth ? { width: panelWidth + 'px', minWidth: panelWidth + 'px' } : {}"
  >
    <!-- Panel Header -->
    <div
      class="flex items-center justify-between flex-shrink-0 px-md border-b border-border"
      :style="{ height: 'var(--header-height)' }"
    >
      <div class="flex flex-col min-w-0">
        <span class="text-heading-sm font-semibold text-text-primary truncate font-mono">
          {{ resource?.name || 'Details' }}
        </span>
        <span v-if="resource?.namespace" class="text-caption text-text-muted">
          {{ resource.namespace }}
        </span>
      </div>
      <div class="flex items-center gap-xs">
        <StatusBadge v-if="resource?.status" :status="resource.status" />
        <button class="btn-ghost btn-sm ml-sm" @click="$emit('update:modelValue', false)">
          <X :size="16" />
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <TabBar
      :tabs="availableTabs"
      :active="activeTab"
      @update:active="uiStore.setActiveTab($event)"
    />

    <!-- Tab Content -->
    <div class="flex-1 overflow-auto p-md">
      <!-- YAML -->
      <div v-if="activeTab === 'yaml'" class="h-full flex flex-col gap-sm">
        <!-- Toolbar -->
        <div class="flex items-center justify-end gap-xs flex-shrink-0">
          <Transition name="fade">
            <span
              v-if="copied || applySuccess"
              class="text-caption flex items-center gap-xs mr-auto"
              style="color: var(--color-status-running)"
            >
              <Check :size="11" />
              {{ copied ? 'Copied!' : 'Applied!' }}
            </span>
          </Transition>
          <button class="btn-ghost btn-sm flex items-center gap-xs" @click="copyYaml">
            <Copy :size="13" />
            Copy
          </button>
          <template v-if="!isHelmRelease">
            <button
              class="btn-ghost btn-sm flex items-center gap-xs"
              @click="editMode ? cancelEdit() : startEdit()"
            >
              <template v-if="editMode">
                <X :size="13" />
                Cancel
              </template>
              <template v-else>
                <Pencil :size="13" />
                Edit
              </template>
            </button>
            <button
              v-if="editMode"
              class="btn-primary btn-sm flex items-center gap-xs"
              :disabled="applyLoading"
              @click="applyYaml"
            >
              <Loader2 v-if="applyLoading" :size="13" class="spin" />
              <Check v-else :size="13" />
              Apply
            </button>
          </template>
        </div>
        <p
          v-if="applyError"
          class="text-body-sm flex-shrink-0"
          style="color: var(--color-status-failed)"
        >
          {{ applyError }}
        </p>
        <pre v-if="!editMode" class="code-block flex-1 text-mono leading-relaxed overflow-auto">{{
          yamlContent
        }}</pre>
        <textarea
          v-else
          v-model="editYaml"
          class="code-block flex-1 resize-none text-mono leading-relaxed focus:outline-none"
          style="white-space: pre; overflow-x: auto; min-height: 0"
          spellcheck="false"
        />
      </div>

      <!-- Describe (key/value metadata) -->
      <div v-else-if="activeTab === 'describe'" class="space-y-md">
        <DescribeSection v-if="resource" :resource="resource" />
      </div>

      <!-- Logs (pods only) -->
      <div v-else-if="activeTab === 'logs'" class="h-full flex flex-col gap-sm">
        <div class="flex items-center gap-sm">
          <SelectDropdown
            v-if="containers.length > 1"
            v-model="selectedContainer"
            :options="containers.map((c) => ({ value: c, label: c }))"
            class="w-48"
          />
          <span v-else class="text-body-sm text-text-muted">{{ containers[0] }}</span>
        </div>
        <Spinner v-if="logsLoading" height="100px" />
        <EmptyState v-else-if="logsError" type="error" :message="logsError" height="100px" />
        <pre
          v-else-if="logs"
          class="code-block flex-1 text-mono leading-relaxed overflow-x-auto"
          style="white-space: pre"
          >{{ logs }}</pre
        >
        <EmptyState v-else type="empty" message="No log output." height="100px" />
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import * as jsYaml from 'js-yaml'
import { X, Copy, Pencil, Check, Loader2 } from 'lucide-vue-next'
import TabBar from '../ui/TabBar.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import SelectDropdown from '../ui/SelectDropdown.vue'
import Spinner from '../ui/Spinner.vue'
import EmptyState from '../ui/EmptyState.vue'
import DescribeSection from './DescribeSection.vue'
import { useUiStore } from '../../stores/ui'
import { useConnectionStore } from '../../stores/connection'
import { useResourceStore } from '../../stores/resources'
import { fetchPodLogs, applyResource } from '../../api/k8s'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  resource: { type: Object, default: null },
  panelWidth: { type: Number, default: null },
})
defineEmits(['update:modelValue'])

const uiStore = useUiStore()
const connStore = useConnectionStore()
const resourceStore = useResourceStore()
const activeTab = computed(() => uiStore.activeTab)

const yamlContent = computed(() => {
  if (!props.resource?.raw) return ''
  try {
    return jsYaml.dump(props.resource.raw, { indent: 2, lineWidth: 120, noRefs: true })
  } catch {
    return JSON.stringify(props.resource.raw, null, 2)
  }
})

// ── YAML copy + edit/apply ───────────────────────────────────────────────
const isHelmRelease = computed(() => props.resource?._kind === 'helm-releases')
const copied = ref(false)
const editMode = ref(false)
const editYaml = ref('')
const applyLoading = ref(false)
const applyError = ref(null)
const applySuccess = ref(false)

function copyYaml() {
  navigator.clipboard.writeText(yamlContent.value).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  })
}

function startEdit() {
  editYaml.value = yamlContent.value
  editMode.value = true
  applyError.value = null
}

function cancelEdit() {
  editMode.value = false
  applyError.value = null
  editYaml.value = ''
}

async function applyYaml() {
  applyError.value = null
  applyLoading.value = true
  try {
    const parsed = jsYaml.load(editYaml.value)
    const def = resourceStore.getResourceDef(props.resource._kind)
    if (!def) throw new Error('Unknown resource type — cannot apply')
    await applyResource(
      connStore.baseUrl,
      def,
      props.resource.namespace,
      props.resource.name,
      parsed,
    )
    applySuccess.value = true
    editMode.value = false
    editYaml.value = ''
    setTimeout(() => {
      applySuccess.value = false
    }, 3000)
  } catch (err) {
    applyError.value = err.message
  } finally {
    applyLoading.value = false
  }
}

// Reset edit mode when switching resources
watch(() => props.resource, cancelEdit)

// Tabs – show Logs only for pods
const isPod = computed(() => props.resource?._kind === 'pods')
const availableTabs = computed(() => {
  const tabs = [
    { id: 'yaml', label: 'YAML' },
    { id: 'describe', label: 'Describe' },
  ]
  if (isPod.value) tabs.push({ id: 'logs', label: 'Logs' })
  return tabs
})

// Containers list
const containers = computed(() => {
  const raw = props.resource?.raw
  if (!raw) return []
  return [...(raw.spec?.initContainers || []), ...(raw.spec?.containers || [])].map((c) => c.name)
})

const selectedContainer = ref(null)

// Reset container selection whenever the resource changes
watch(
  () => props.resource,
  (res) => {
    selectedContainer.value = res ? (containers.value[0] ?? null) : null
  },
  { immediate: true },
)

// ── Logs (inline, no composable indirection) ─────────────────────────────
const logs = ref('')
const logsLoading = ref(false)
const logsError = ref(null)
let _logTimer = null

async function doFetchLogs() {
  if (!connStore.isConnected) return
  if (!props.resource || props.resource._kind !== 'pods') return
  logsLoading.value = true
  logsError.value = null
  try {
    logs.value = await fetchPodLogs(
      connStore.baseUrl,
      props.resource.namespace,
      props.resource.name,
      selectedContainer.value,
      300,
    )
  } catch (err) {
    logsError.value = err.message
  } finally {
    logsLoading.value = false
  }
}

function startLogPolling() {
  stopLogPolling()
  doFetchLogs()
  _logTimer = setInterval(doFetchLogs, 5000)
}

function stopLogPolling() {
  if (_logTimer) {
    clearInterval(_logTimer)
    _logTimer = null
  }
  logs.value = ''
  logsError.value = null
}

// Start/stop polling when tab changes or resource changes
watch([activeTab, () => props.resource], ([tab]) => {
  if (tab === 'logs' && isPod.value) {
    startLogPolling()
  } else {
    stopLogPolling()
  }
})

// Re-fetch when container selection changes (only while on logs tab)
watch(selectedContainer, () => {
  if (activeTab.value === 'logs' && isPod.value) startLogPolling()
})

onUnmounted(stopLogPolling)
</script>
