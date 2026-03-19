import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const STATUSES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
}

// In development the Vite dev server proxies /api, /apis and /version to
// localhost:8001 server-side, so the browser never makes a cross-origin request.
// We ALWAYS use '' (relative) in dev — localStorage is intentionally ignored
// so a stale stored URL can never bypass the proxy and trigger CORS.
const IS_DEV = import.meta.env.DEV

export const useConnectionStore = defineStore('connection', () => {
  // Dev: always relative ('').  Prod: read saved URL or fall back to default.
  const baseUrl = ref(
    IS_DEV ? '' : localStorage.getItem('tether:baseUrl') || 'http://localhost:8001',
  )
  const status = ref(STATUSES.DISCONNECTED)
  const errorMessage = ref('')
  const serverVersion = ref(null)
  const clusterInfo = ref(null)

  const isConnected = computed(() => status.value === STATUSES.CONNECTED)
  const isConnecting = computed(() => status.value === STATUSES.CONNECTING)

  function setBaseUrl(url) {
    if (IS_DEV) return // proxy handles routing in dev; URL is always ''
    baseUrl.value = url.replace(/\/$/, '')
    localStorage.setItem('tether:baseUrl', baseUrl.value)
  }

  async function connect() {
    status.value = STATUSES.CONNECTING
    errorMessage.value = ''

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort('timeout'), 8000)

    try {
      const response = await fetch(`${baseUrl.value}/version`, { signal: controller.signal })
      clearTimeout(timer)
      if (!response.ok) throw new Error(`HTTP ${response.status} — unexpected response from proxy`)
      const data = await response.json()
      serverVersion.value = data
      status.value = STATUSES.CONNECTED
      return true
    } catch (err) {
      clearTimeout(timer)
      status.value = STATUSES.ERROR

      if (err.name === 'AbortError' || err.message === 'timeout') {
        errorMessage.value = 'Connection timed out. Is kubectl proxy running on localhost:8001?'
      } else if (
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('ERR_CONNECTION')
      ) {
        errorMessage.value = 'Could not reach kubectl proxy. Run: kubectl proxy'
      } else {
        errorMessage.value = err.message || 'Unable to reach kubectl proxy'
      }
      return false
    }
  }

  function disconnect() {
    status.value = STATUSES.DISCONNECTED
    serverVersion.value = null
    clusterInfo.value = null
  }

  return {
    baseUrl,
    status,
    errorMessage,
    serverVersion,
    clusterInfo,
    isConnected,
    isConnecting,
    setBaseUrl,
    connect,
    disconnect,
  }
})
