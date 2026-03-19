import { ref } from 'vue'
import { useConnectionStore } from '../stores/connection'
import { fetchPodLogs } from '../api/k8s'

/**
 * usePodLogs – fetches and polls logs for a specific pod container.
 */
export function usePodLogs(namespace, podName, container = null, tailLines = 300) {
  const connStore = useConnectionStore()
  const logs = ref('')
  const loading = ref(false)
  const error = ref(null)
  let _timer = null

  async function fetch() {
    if (!connStore.isConnected) return
    loading.value = true
    error.value = null
    try {
      logs.value = await fetchPodLogs(connStore.baseUrl, namespace, podName, container, tailLines)
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function start(intervalMs = 5000) {
    fetch()
    _timer = setInterval(fetch, intervalMs)
  }

  function stop() {
    if (_timer) {
      clearInterval(_timer)
      _timer = null
    }
  }

  return { logs, loading, error, start, stop, fetch }
}
