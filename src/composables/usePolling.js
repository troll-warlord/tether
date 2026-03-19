import { ref, onUnmounted } from 'vue'

/**
 * usePolling – runs `fn` immediately and then at `intervalMs` cadence.
 * Stops automatically when the component unmounts.
 */
export function usePolling(fn, intervalMs = 8000) {
  const timer = ref(null)
  const running = ref(false)

  async function tick() {
    running.value = true
    try {
      await fn()
    } finally {
      running.value = false
    }
  }

  function start() {
    tick()
    timer.value = setInterval(tick, intervalMs)
  }

  function stop() {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  onUnmounted(stop)

  return { start, stop, running }
}
