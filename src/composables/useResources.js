import { watch, isRef } from 'vue'
import { useResourceStore } from '../stores/resources'
import { useNamespaceStore } from '../stores/namespaces'
import { useConnectionStore } from '../stores/connection'
import { usePolling } from './usePolling'

/**
 * useResources – manages fetching + polling for a given resource type.
 * resourceId may be a plain string or a computed/ref.
 * Automatically re-fetches when resourceId, namespace, or connection changes.
 */
export function useResources(resourceId, pollInterval = 8000) {
  const resourceStore = useResourceStore()
  const nsStore = useNamespaceStore()
  const connStore = useConnectionStore()

  const getId = () => (isRef(resourceId) ? resourceId.value : resourceId)

  const { start, stop, running } = usePolling(
    () => resourceStore.fetchResource(getId()),
    pollInterval,
  )

  // Re-fetch immediately when resource type, namespace, or connection changes
  watch(
    [
      () => (isRef(resourceId) ? resourceId.value : resourceId),
      () => nsStore.selectedNamespace,
      () => connStore.isConnected,
    ],
    ([, , connected]) => {
      if (connected) {
        stop()
        start()
      }
    },
  )

  return { start, stop, loading: running }
}
