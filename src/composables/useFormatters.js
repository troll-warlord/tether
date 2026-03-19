/**
 * Shared formatting utilities.
 */

/**
 * Format a Kubernetes timestamp as relative time (e.g. "2h ago").
 */
export function formatAge(timestamp) {
  if (!timestamp) return '—'
  const now = Date.now()
  const ts = new Date(timestamp).getTime()
  const diff = Math.floor((now - ts) / 1000)

  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'Ki', 'Mi', 'Gi', 'Ti']
  let i = 0
  let val = bytes
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024
    i++
  }
  return `${val.toFixed(1)} ${units[i]}`
}

/**
 * Truncate a string to maxLen characters, appending '...' if needed.
 */
export function truncate(str, maxLen = 40) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

/**
 * Format a key=value label map into a chip array.
 */
export function labelsToChips(labels = {}) {
  return Object.entries(labels).map(([k, v]) => `${k}=${v}`)
}
