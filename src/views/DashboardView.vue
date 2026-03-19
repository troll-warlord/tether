<template>
  <div class="flex h-screen overflow-hidden bg-bg-base">
    <!-- Sidebar -->
    <Sidebar
      :collapsed="uiStore.sidebarCollapsed"
      :custom-width="uiStore.sidebarCollapsed ? null : sidebarWidth"
      :selected-resource-type="resourceStore.selectedResourceType"
      :active-view="activeView"
      @toggle-collapse="uiStore.toggleSidebar()"
      @select-resource="onSelectResource"
      @select-dashboard="showDashboard"
      @select-graph="showGraph"
      @open-settings="settingsOpen = true"
    />

    <!-- Sidebar resize handle -->
    <div
      v-if="!uiStore.sidebarCollapsed"
      class="w-[3px] flex-shrink-0 cursor-col-resize transition-colors duration-100 z-10"
      style="background: var(--color-border)"
      @mousedown="startSidebarResize"
      @mouseenter="(e) => (e.currentTarget.style.background = 'var(--color-brand)')"
      @mouseleave="(e) => (e.currentTarget.style.background = 'var(--color-border)')"
    />

    <!-- Main content area -->
    <div class="flex flex-col flex-1 overflow-hidden">
      <ResourceView
        v-if="activeView === 'resource' && resourceStore.selectedResourceType"
        :resource-type="resourceStore.selectedResourceType"
      />

      <!-- Dependency graph -->
      <ResourceGraph v-else-if="activeView === 'graph'" @select-resource="onSelectResource" />

      <!-- Overview dashboard -->
      <OverviewDashboard v-else @select-resource="onSelectResource" />
    </div>

    <!-- Settings Modal -->
    <Modal v-model="settingsOpen" title="Settings">
      <div class="space-y-md">
        <div>
          <label class="text-label text-text-secondary mb-xs block">Proxy URL</label>
          <div class="flex gap-sm">
            <input v-model="urlInput" type="url" class="input flex-1" />
            <button class="btn-primary" @click="reconnect">Reconnect</button>
          </div>
        </div>
        <div>
          <label class="text-label text-text-secondary mb-xs block">Theme</label>
          <div class="flex gap-sm">
            <button
              class="btn-secondary flex-1"
              :class="{ 'border-brand text-brand': uiStore.theme === 'light' }"
              @click="uiStore.setTheme('light')"
            >
              <Sun :size="14" />
              Light
            </button>
            <button
              class="btn-secondary flex-1"
              :class="{ 'border-brand text-brand': uiStore.theme === 'dark' }"
              @click="uiStore.setTheme('dark')"
            >
              <Moon :size="14" />
              Dark
            </button>
          </div>
        </div>
        <div class="pt-sm border-t border-border">
          <button class="btn-danger w-full" @click="disconnect">Disconnect</button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Sun, Moon } from 'lucide-vue-next'
import Sidebar from '../components/layout/Sidebar.vue'
import ResourceView from '../components/resources/ResourceView.vue'
import Modal from '../components/ui/Modal.vue'
import OverviewDashboard from '../components/charts/OverviewDashboard.vue'
import ResourceGraph from '../components/graph/ResourceGraph.vue'
import { useUiStore } from '../stores/ui'
import { useResourceStore } from '../stores/resources'
import { useConnectionStore } from '../stores/connection'
import { useNamespaceStore } from '../stores/namespaces'

const uiStore = useUiStore()
const resourceStore = useResourceStore()
const connStore = useConnectionStore()
const nsStore = useNamespaceStore()
const router = useRouter()

const settingsOpen = ref(false)
const urlInput = ref(connStore.baseUrl)

// ── Active view state ──────────────────────────────────────────────────
// 'dashboard' | 'graph' | 'resource'
const activeView = ref('dashboard')

function showDashboard() {
  activeView.value = 'dashboard'
  resourceStore.selectResourceType(null)
}

function showGraph() {
  activeView.value = 'graph'
  resourceStore.selectResourceType(null)
}

function onSelectResource(id) {
  activeView.value = 'resource'
  resourceStore.selectResourceType(id)
}

// ── Sidebar resize ─────────────────────────────────────────────────────────
const sidebarWidth = ref(220)

function startSidebarResize(e) {
  e.preventDefault()
  const startX = e.clientX
  const startW = sidebarWidth.value
  function onMove(ev) {
    sidebarWidth.value = Math.max(160, Math.min(420, startW + ev.clientX - startX))
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

onMounted(async () => {
  if (!connStore.isConnected) {
    router.push('/')
    return
  }
  await nsStore.fetchNamespaces()
})

async function reconnect() {
  connStore.setBaseUrl(urlInput.value)
  settingsOpen.value = false
  const ok = await connStore.connect()
  if (ok) {
    resourceStore.invalidateAll()
    await nsStore.fetchNamespaces()
  } else {
    router.push('/')
  }
}

function disconnect() {
  connStore.disconnect()
  resourceStore.invalidateAll()
  settingsOpen.value = false
  router.push('/')
}
</script>
