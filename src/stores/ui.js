import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const theme = ref(localStorage.getItem('tether:theme') || 'dark')
  const sidebarCollapsed = ref(false)
  const detailsPanelOpen = ref(false)
  const activeTab = ref('yaml') // yaml | describe | logs
  const searchQuery = ref('')
  const statusFilter = ref('all')
  const helmFilter = ref(null) // app.kubernetes.io/instance release name, or null

  // Persist & apply theme
  function setTheme(value) {
    theme.value = value
    localStorage.setItem('tether:theme', value)
    document.documentElement.setAttribute('data-theme', value)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function openDetailsPanel() {
    detailsPanelOpen.value = true
  }

  function closeDetailsPanel() {
    detailsPanelOpen.value = false
  }

  function setActiveTab(tab) {
    activeTab.value = tab
  }

  function setHelmFilter(name) {
    helmFilter.value = name
  }

  function clearHelmFilter() {
    helmFilter.value = null
  }

  return {
    theme,
    sidebarCollapsed,
    detailsPanelOpen,
    activeTab,
    searchQuery,
    statusFilter,
    helmFilter,
    setTheme,
    toggleTheme,
    applyTheme,
    toggleSidebar,
    openDetailsPanel,
    closeDetailsPanel,
    setActiveTab,
    setHelmFilter,
    clearHelmFilter,
  }
})
