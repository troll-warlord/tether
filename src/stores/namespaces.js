import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useConnectionStore } from './connection'

export const ALL_NAMESPACES = '__all__'

export const useNamespaceStore = defineStore('namespaces', () => {
  const connection = useConnectionStore()

  const namespaces = ref([])
  const selectedNamespace = ref(ALL_NAMESPACES)
  const loading = ref(false)
  const error = ref(null)

  const namespaceOptions = computed(() => [
    { value: ALL_NAMESPACES, label: 'All Namespaces' },
    ...namespaces.value.map((ns) => ({ value: ns, label: ns })),
  ])

  async function fetchNamespaces() {
    if (!connection.isConnected) return
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${connection.baseUrl}/api/v1/namespaces`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      namespaces.value = (data.items || []).map((ns) => ns.metadata.name).sort()
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function selectNamespace(ns) {
    selectedNamespace.value = ns
  }

  return {
    namespaces,
    selectedNamespace,
    loading,
    error,
    namespaceOptions,
    fetchNamespaces,
    selectNamespace,
  }
})
