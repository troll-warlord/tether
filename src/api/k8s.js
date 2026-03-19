/**
 * Kubernetes API path builder.
 * Handles both core (v1) and grouped (apps/v1, networking.k8s.io/v1, etc.) APIs.
 * Supports namespace-scoped and cluster-scoped resources.
 */

import { ALL_NAMESPACES } from '../stores/namespaces'

/**
 * Build the API path for a resource list.
 * @param {string} apiGroup   e.g. "v1", "apps/v1", "batch/v1", "networking.k8s.io/v1"
 * @param {string} plural     e.g. "pods", "deployments"
 * @param {string|null} ns    namespace or ALL_NAMESPACES or null for cluster-scoped
 */
export function buildApiPath(apiGroup, plural, ns = null) {
  const isCoreApi = apiGroup === 'v1'
  const base = isCoreApi ? '/api/v1' : `/apis/${apiGroup}`

  if (!ns || ns === ALL_NAMESPACES) {
    return `${base}/${plural}`
  }

  return `${base}/namespaces/${ns}/${plural}`
}

/**
 * Normalize a raw K8s object into a flattened display-friendly shape.
 * The original raw object is preserved at `.raw`.
 */
export function normalizeResource(item, def) {
  return {
    uid: item.metadata?.uid ?? '',
    name: item.metadata?.name ?? '',
    namespace: item.metadata?.namespace ?? '',
    labels: item.metadata?.labels ?? {},
    annotations: item.metadata?.annotations ?? {},
    creationTimestamp: item.metadata?.creationTimestamp ?? null,
    resourceVersion: item.metadata?.resourceVersion ?? '',
    kind: item.kind ?? def?.label ?? '',
    status: extractStatus(item),
    raw: item,
    _kind: def?.id ?? '',
  }
}

/**
 * Extract a human-readable status string from a K8s object.
 */
export function extractStatus(item) {
  const kind = item.kind?.toLowerCase()

  if (kind === 'pod') {
    if (item.metadata?.deletionTimestamp) return 'Terminating'
    const phase = item.status?.phase
    // Check container-level waiting states for common crash reasons
    const containerStatuses = item.status?.containerStatuses ?? []
    for (const cs of containerStatuses) {
      const reason = cs.state?.waiting?.reason
      if (reason === 'CrashLoopBackOff') return 'CrashLoopBackOff'
      if (reason === 'OOMKilled') return 'OOMKilled'
      if (reason === 'ErrImagePull' || reason === 'ImagePullBackOff') return reason
    }
    const ready = (item.status?.conditions ?? []).find((c) => c.type === 'Ready')
    if (phase === 'Running' && ready?.status === 'True') return 'Running'
    if (phase === 'Running') return 'Not Ready'
    if (phase === 'Succeeded') return 'Succeeded'
    if (phase === 'Failed') return 'Failed'
    if (phase === 'Pending') return 'Pending'
    return phase ?? 'Unknown'
  }

  if (kind === 'deployment') {
    const desired = item.spec?.replicas ?? 0
    const ready = item.status?.readyReplicas ?? 0
    const updated = item.status?.updatedReplicas ?? 0
    const available = item.status?.availableReplicas ?? 0
    if (desired === 0) return 'Scaled Down'
    // Fully healthy: all replicas ready, updated, and available
    if (ready >= desired && updated >= desired && available >= desired) return 'Available'
    // Explicit failure condition
    const conds = item.status?.conditions ?? []
    const progCond = conds.find((c) => c.type === 'Progressing')
    if (progCond?.reason === 'ProgressDeadlineExceeded') return 'Degraded'
    // Rolling update in progress
    if (updated < desired || ready < desired) return 'Progressing'
    return 'Degraded'
  }

  if (kind === 'statefulset') {
    const desired = item.spec?.replicas ?? 1
    const ready = item.status?.readyReplicas ?? 0
    if (desired === 0) return 'Scaled Down'
    return ready >= desired ? 'Running' : 'Progressing'
  }

  if (kind === 'daemonset') {
    const desired = item.status?.desiredNumberScheduled ?? 0
    const ready = item.status?.numberReady ?? 0
    if (desired === 0) return 'No Nodes'
    return ready >= desired ? 'Running' : 'Progressing'
  }

  if (kind === 'replicaset') {
    const desired = item.spec?.replicas ?? 0
    const ready = item.status?.readyReplicas ?? 0
    if (desired === 0) return 'Scaled Down'
    return ready >= desired ? 'Running' : 'Progressing'
  }

  if (kind === 'job') {
    const completions = item.spec?.completions ?? 1
    if (item.status?.succeeded >= completions) return 'Complete'
    if (item.status?.failed > 0) return 'Failed'
    if (item.status?.active > 0) return 'Running'
    return 'Pending'
  }

  if (kind === 'cronjob') {
    if (item.spec?.suspend) return 'Suspended'
    const active = item.status?.active?.length ?? 0
    return active > 0 ? 'Active' : 'Scheduled'
  }

  if (kind === 'service') {
    return item.spec?.type ?? 'ClusterIP'
  }

  if (kind === 'ingress') {
    const ingress = item.status?.loadBalancer?.ingress ?? []
    return ingress.length > 0 ? 'Active' : 'Pending'
  }

  if (kind === 'networkpolicy') {
    return 'Active'
  }

  if (kind === 'endpoints') {
    const subsets = item.subsets ?? []
    const total = subsets.reduce((n, s) => n + (s.addresses?.length ?? 0), 0)
    return total > 0 ? 'Ready' : 'Not Ready'
  }

  if (kind === 'persistentvolume') {
    return item.status?.phase ?? 'Unknown'
  }

  if (kind === 'persistentvolumeclaim') {
    return item.status?.phase ?? 'Pending'
  }

  if (kind === 'storageclass') {
    return 'Active'
  }

  if (kind === 'configmap') return 'Active'
  if (kind === 'secret') return 'Active'
  if (kind === 'serviceaccount') return 'Active'
  if (kind === 'resourcequota') return 'Active'
  if (kind === 'limitrange') return 'Active'
  if (kind === 'role') return 'Active'
  if (kind === 'rolebinding') return 'Active'
  if (kind === 'clusterrole') return 'Active'
  if (kind === 'clusterrolebinding') return 'Active'

  if (kind === 'horizontalpodautoscaler') {
    const current = item.status?.currentReplicas ?? 0
    const desired = item.status?.desiredReplicas ?? 0
    const min = item.spec?.minReplicas ?? 1
    const max = item.spec?.maxReplicas ?? 1
    if (desired === current && current >= min && current <= max) return 'Active'
    return 'Scaling'
  }

  if (kind === 'poddisruptionbudget') {
    const disruptions = item.status?.disruptionsAllowed ?? 0
    return disruptions >= 0 ? 'Active' : 'Disrupted'
  }

  if (kind === 'namespace') {
    return item.status?.phase ?? 'Active'
  }

  if (kind === 'node') {
    const conds = item.status?.conditions ?? []
    const ready = conds.find((c) => c.type === 'Ready')
    if (item.spec?.unschedulable) return 'Unschedulable'
    return ready?.status === 'True' ? 'Ready' : 'Not Ready'
  }

  if (kind === 'event') {
    return item.type === 'Warning' ? 'Warning' : 'Normal'
  }

  // Generic fallback
  const phase = item.status?.phase
  if (phase) return phase
  const conds = item.status?.conditions ?? []
  const ready = conds.find((c) => c.type === 'Ready')
  if (ready?.status === 'True') return 'Ready'
  if (conds.length > 0) return conds[conds.length - 1].type ?? 'Unknown'
  return 'Active'
}

/**
 * Map a status string to a CSS badge class.
 */
export function statusToBadgeClass(status) {
  const s = status?.toLowerCase() ?? 'unknown'
  if (
    [
      'running',
      'available',
      'ready',
      'active',
      'bound',
      'complete',
      'scheduled',
      'normal',
    ].includes(s)
  )
    return 'badge-running'
  if (
    [
      'pending',
      'progressing',
      'not ready',
      'clusterip',
      'loadbalancer',
      'nodeport',
      'externalname',
      'deployed',
      'scaled down',
      'no nodes',
      'scaling',
      'unschedulable',
    ].includes(s)
  )
    return 'badge-pending'
  if (
    [
      'failed',
      'degraded',
      'crashloopbackoff',
      'error',
      'oomkilled',
      'errimagepull',
      'imagepullbackoff',
      'superseded',
      'not ready',
      'disrupted',
    ].includes(s)
  )
    return 'badge-failed'
  if (['succeeded'].includes(s)) return 'badge-succeeded'
  if (['terminating', 'evicted', 'suspended', 'uninstalled', 'uninstalling', 'warning'].includes(s))
    return 'badge-warning'
  return 'badge-unknown'
}

/**
 * Fetch resources filtered by a label selector.
 * Returns an array of normalized resources, or [] on any error.
 */
export async function fetchByLabelSelector(baseUrl, apiGroup, plural, ns, labelSelector) {
  const isCoreApi = apiGroup === 'v1'
  const base = isCoreApi ? '/api/v1' : `/apis/${apiGroup}`
  const nsPath = ns ? `/namespaces/${encodeURIComponent(ns)}` : ''
  const url = `${baseUrl}${base}${nsPath}/${plural}?labelSelector=${encodeURIComponent(labelSelector)}`
  try {
    const resp = await fetch(url)
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.items ?? []).map((item) => normalizeResource(item, { id: plural, label: plural }))
  } catch {
    return []
  }
}

/**
 * Fetch a single named K8s resource by name.
 * Returns a normalized resource or null if not found / on error.
 */
export async function fetchSingleResource(baseUrl, apiGroup, plural, ns, name) {
  const isCoreApi = apiGroup === 'v1'
  const base = isCoreApi ? '/api/v1' : `/apis/${apiGroup}`
  const nsPath = ns ? `/namespaces/${encodeURIComponent(ns)}` : ''
  const url = `${baseUrl}${base}${nsPath}/${plural}/${encodeURIComponent(name)}`
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const item = await resp.json()
    return normalizeResource(item, { id: plural, label: plural })
  } catch {
    return null
  }
}

/**
 * Decode a base64-encoded gzipped Helm release secret into a display object.
 * Helm v3 stores releases as Secrets with type=helm.sh/release.v1
 */
export function normalizeHelmRelease(secret) {
  const labels = secret.metadata?.labels ?? {}
  return {
    uid: secret.metadata?.uid ?? '',
    name: labels['name'] ?? secret.metadata?.name ?? '',
    namespace: secret.metadata?.namespace ?? '',
    labels,
    annotations: secret.metadata?.annotations ?? {},
    creationTimestamp: secret.metadata?.creationTimestamp ?? null,
    resourceVersion: secret.metadata?.resourceVersion ?? '',
    kind: 'HelmRelease',
    status: labels['status'] ?? 'unknown',
    chart: labels['chart'] ?? '—',
    version: labels['version'] ?? '—',
    raw: secret,
    _kind: 'helm-releases',
  }
}

/**
 * Fetch pod logs from the API.
 */
export async function fetchPodLogs(baseUrl, namespace, podName, container = null, tailLines = 200) {
  const params = new URLSearchParams({ tailLines: String(tailLines) })
  if (container) params.append('container', container)
  const url = `${baseUrl}/api/v1/namespaces/${namespace}/pods/${podName}/log?${params}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.text()
}

/**
 * Apply (PUT/replace) a resource to the cluster.
 */
export async function applyResource(baseUrl, def, namespace, name, body) {
  const path = buildApiPath(def.apiGroup, def.plural, namespace)
  const url = `${baseUrl}${path}/${name}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = await res.json()
      msg = j.message || msg
    } catch {
      // response body is not JSON — use the default HTTP status message
    }
    throw new Error(msg)
  }
  return res.json()
}

/**
 * Fetch a single resource by name.
 */
export async function fetchResourceDetail(baseUrl, apiGroup, plural, namespace, name) {
  const path = namespace
    ? buildApiPath(apiGroup, plural, namespace)
    : buildApiPath(apiGroup, plural, null)
  const res = await fetch(`${baseUrl}${path}/${name}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
