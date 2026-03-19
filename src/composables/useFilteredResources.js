import { computed } from 'vue'
import { useUiStore } from '../stores/ui'
import { useResourceStore } from '../stores/resources'

/**
 * useSearch – returns a filtered + searched list of items.
 */
export function useFilteredResources() {
  const ui = useUiStore()
  const resourceStore = useResourceStore()

  const filtered = computed(() => {
    let items = resourceStore.currentItems
    const q = ui.searchQuery.trim().toLowerCase()
    const sf = ui.statusFilter

    if (q) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.namespace.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q),
      )
    }

    if (sf && sf !== 'all') {
      items = items.filter((item) => item.status.toLowerCase() === sf.toLowerCase())
    }

    // Apply Helm chart filter by instance label (skip on the helm-releases view itself)
    if (ui.helmFilter && resourceStore.selectedResourceType !== 'helm-releases') {
      items = items.filter((item) => item.labels?.['app.kubernetes.io/instance'] === ui.helmFilter)
    }

    return items
  })

  return { filtered }
}
