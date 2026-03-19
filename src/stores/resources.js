import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useConnectionStore } from './connection'
import { useNamespaceStore } from './namespaces'
import { buildApiPath, normalizeResource, normalizeHelmRelease } from '../api/k8s'

export const RESOURCE_GROUPS = [
  {
    id: 'workloads',
    label: 'Workloads',
    resources: [
      { id: 'pods', label: 'Pods', plural: 'pods', apiGroup: 'v1', namespaced: true },
      {
        id: 'deployments',
        label: 'Deployments',
        plural: 'deployments',
        apiGroup: 'apps/v1',
        namespaced: true,
      },
      {
        id: 'statefulsets',
        label: 'StatefulSets',
        plural: 'statefulsets',
        apiGroup: 'apps/v1',
        namespaced: true,
      },
      {
        id: 'daemonsets',
        label: 'DaemonSets',
        plural: 'daemonsets',
        apiGroup: 'apps/v1',
        namespaced: true,
      },
      {
        id: 'replicasets',
        label: 'ReplicaSets',
        plural: 'replicasets',
        apiGroup: 'apps/v1',
        namespaced: true,
      },
      { id: 'jobs', label: 'Jobs', plural: 'jobs', apiGroup: 'batch/v1', namespaced: true },
      {
        id: 'cronjobs',
        label: 'CronJobs',
        plural: 'cronjobs',
        apiGroup: 'batch/v1',
        namespaced: true,
      },
      {
        id: 'horizontalpodautoscalers',
        label: 'HPA',
        plural: 'horizontalpodautoscalers',
        apiGroup: 'autoscaling/v2',
        namespaced: true,
      },
      {
        id: 'poddisruptionbudgets',
        label: 'PodDisruptionBudgets',
        plural: 'poddisruptionbudgets',
        apiGroup: 'policy/v1',
        namespaced: true,
      },
    ],
  },
  {
    id: 'network',
    label: 'Network',
    resources: [
      { id: 'services', label: 'Services', plural: 'services', apiGroup: 'v1', namespaced: true },
      {
        id: 'ingresses',
        label: 'Ingresses',
        plural: 'ingresses',
        apiGroup: 'networking.k8s.io/v1',
        namespaced: true,
      },
      {
        id: 'networkpolicies',
        label: 'NetworkPolicies',
        plural: 'networkpolicies',
        apiGroup: 'networking.k8s.io/v1',
        namespaced: true,
      },
      {
        id: 'endpoints',
        label: 'Endpoints',
        plural: 'endpoints',
        apiGroup: 'v1',
        namespaced: true,
      },
    ],
  },
  {
    id: 'storage',
    label: 'Storage',
    resources: [
      {
        id: 'persistentvolumes',
        label: 'PersistentVolumes',
        plural: 'persistentvolumes',
        apiGroup: 'v1',
        namespaced: false,
      },
      {
        id: 'persistentvolumeclaims',
        label: 'PersistentVolumeClaims',
        plural: 'persistentvolumeclaims',
        apiGroup: 'v1',
        namespaced: true,
      },
      {
        id: 'storageclasses',
        label: 'StorageClasses',
        plural: 'storageclasses',
        apiGroup: 'storage.k8s.io/v1',
        namespaced: false,
      },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    resources: [
      {
        id: 'configmaps',
        label: 'ConfigMaps',
        plural: 'configmaps',
        apiGroup: 'v1',
        namespaced: true,
      },
      { id: 'secrets', label: 'Secrets', plural: 'secrets', apiGroup: 'v1', namespaced: true },
      {
        id: 'resourcequotas',
        label: 'ResourceQuotas',
        plural: 'resourcequotas',
        apiGroup: 'v1',
        namespaced: true,
      },
      {
        id: 'limitranges',
        label: 'LimitRanges',
        plural: 'limitranges',
        apiGroup: 'v1',
        namespaced: true,
      },
    ],
  },
  {
    id: 'access',
    label: 'Access Control',
    resources: [
      {
        id: 'serviceaccounts',
        label: 'ServiceAccounts',
        plural: 'serviceaccounts',
        apiGroup: 'v1',
        namespaced: true,
      },
      {
        id: 'roles',
        label: 'Roles',
        plural: 'roles',
        apiGroup: 'rbac.authorization.k8s.io/v1',
        namespaced: true,
      },
      {
        id: 'rolebindings',
        label: 'RoleBindings',
        plural: 'rolebindings',
        apiGroup: 'rbac.authorization.k8s.io/v1',
        namespaced: true,
      },
      {
        id: 'clusterroles',
        label: 'ClusterRoles',
        plural: 'clusterroles',
        apiGroup: 'rbac.authorization.k8s.io/v1',
        namespaced: false,
      },
      {
        id: 'clusterrolebindings',
        label: 'ClusterRoleBindings',
        plural: 'clusterrolebindings',
        apiGroup: 'rbac.authorization.k8s.io/v1',
        namespaced: false,
      },
    ],
  },
  {
    id: 'cluster',
    label: 'Cluster',
    resources: [
      {
        id: 'namespaces',
        label: 'Namespaces',
        plural: 'namespaces',
        apiGroup: 'v1',
        namespaced: false,
      },
      { id: 'nodes', label: 'Nodes', plural: 'nodes', apiGroup: 'v1', namespaced: false },
      { id: 'events', label: 'Events', plural: 'events', apiGroup: 'v1', namespaced: true },
    ],
  },
  {
    id: 'helm',
    label: 'Helm',
    resources: [
      {
        id: 'helm-releases',
        label: 'Releases',
        plural: null,
        apiGroup: null,
        namespaced: true,
        helm: true,
      },
    ],
  },
]

export const useResourceStore = defineStore('resources', () => {
  const connection = useConnectionStore()
  const nsStore = useNamespaceStore()

  // Map of resourceId -> { items: [], loading: bool, error: string|null }
  const cache = ref({})

  const selectedResourceType = ref(null)
  const selectedResource = ref(null)

  const currentItems = computed(() => {
    if (!selectedResourceType.value) return []
    return cache.value[selectedResourceType.value]?.items ?? []
  })

  const currentLoading = computed(() => {
    if (!selectedResourceType.value) return false
    return cache.value[selectedResourceType.value]?.loading ?? false
  })

  function getResourceDef(resourceId) {
    for (const group of RESOURCE_GROUPS) {
      const def = group.resources.find((r) => r.id === resourceId)
      if (def) return def
    }
    return null
  }

  async function fetchResource(resourceId) {
    if (!connection.isConnected) return

    const def = getResourceDef(resourceId)
    if (!def) return

    if (!cache.value[resourceId]) {
      cache.value[resourceId] = { items: [], loading: false, error: null }
    }

    cache.value[resourceId].loading = true
    cache.value[resourceId].error = null

    try {
      // Helm releases are stored as Kubernetes Secrets with label owner=helm
      if (def.helm) {
        const ns = nsStore.selectedNamespace
        const path = buildApiPath('v1', 'secrets', ns)
        const res = await fetch(`${connection.baseUrl}${path}?labelSelector=owner%3Dhelm`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        cache.value[resourceId].items = (data.items || []).map((item) => normalizeHelmRelease(item))
      } else {
        const ns = def.namespaced ? nsStore.selectedNamespace : null
        const path = buildApiPath(def.apiGroup, def.plural, ns)
        const res = await fetch(`${connection.baseUrl}${path}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        cache.value[resourceId].items = (data.items || []).map((item) =>
          normalizeResource(item, def),
        )
      }
    } catch (err) {
      cache.value[resourceId].error = err.message
    } finally {
      cache.value[resourceId].loading = false
    }
  }

  function selectResourceType(resourceId) {
    selectedResourceType.value = resourceId
    selectedResource.value = null
  }

  function selectResource(resource) {
    selectedResource.value = resource
  }

  function invalidateAll() {
    cache.value = {}
  }

  return {
    cache,
    selectedResourceType,
    selectedResource,
    currentItems,
    currentLoading,
    RESOURCE_GROUPS,
    getResourceDef,
    fetchResource,
    selectResourceType,
    selectResource,
    invalidateAll,
  }
})
