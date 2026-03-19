/**
 * useGraphTransformer — Helm-centric graph builder
 *
 * Builds Vue Flow graphs scoped to a single Helm release.
 * Resources owned by the release go inside a group box.
 * External dependencies (secrets, configmaps, pvcs, serviceaccounts
 * not part of the release) float outside the box with dashed edges.
 */

// ── Layout constants ──────────────────────────────────────────────────────
const NODE_W = 190 // node card width
const NODE_H = 68 // node card height
const H_GAP = 56 // horizontal gap between lane columns
const V_GAP = 16 // vertical gap between nodes in same lane
const GROUP_PAD = 32 // padding inside group box
const HEADER_H = 36 // group header height
const CFG_ROW_GAP = 28 // vertical gap before config / storage rows
const EXT_COL_GAP = 72 // gap between group right edge and external column
const EXT_V_GAP = 12 // vertical gap between external nodes
const EXT_SEC_GAP = 20 // extra gap between external type groups

// ── Helpers ───────────────────────────────────────────────────────────────
function nid(kind, name, ns) {
  return `${kind}/${ns ?? '_'}/${name}`
}

function selectorMatches(selector, labels) {
  if (!selector || !labels) return false
  return Object.entries(selector).every(([k, v]) => labels[k] === v)
}

// ── Lane column X positions (relative to group left-padding edge) ─────────
const COL = {
  ingress: 0,
  service: NODE_W + H_GAP,
  workload: (NODE_W + H_GAP) * 2, // deployment + statefulset
  replicaset: (NODE_W + H_GAP) * 3,
  pod: (NODE_W + H_GAP) * 4,
}

// ── Health helpers ────────────────────────────────────────────────────────
const FAILED_STATUSES = new Set([
  'Failed',
  'CrashLoopBackOff',
  'OOMKilled',
  'ImagePullBackOff',
  'ErrImagePull',
  'Error',
  'Lost',
])
const PENDING_STATUSES = new Set(['Pending', 'Progressing', 'Terminating', 'Not Ready'])

/**
 * buildHelmAppGroups
 * Returns a sorted list of Helm-release summaries for the AppGrid.
 * Health is computed from pods matched by the release instance label.
 */
const HIDDEN_STATUSES = new Set(['superseded', 'uninstalled', 'uninstalling'])

export function buildHelmAppGroups(
  helmReleases = [],
  allPods = [],
  allDeployments = [],
  allServices = [],
  allIngresses = [],
) {
  if (!helmReleases?.length) return []
  return helmReleases
    .filter((r) => r?.name && !HIDDEN_STATUSES.has(r.status?.toLowerCase()))
    .map((release) => {
      const name = release.name
      const ns = release.namespace ?? release.raw?.metadata?.namespace ?? 'default'
      const key = `${ns}/${name}`

      function byInstance(arr) {
        return (arr ?? []).filter((r) => {
          const labels = r.raw?.metadata?.labels ?? {}
          return labels['app.kubernetes.io/instance'] === name || labels['helm.sh/release'] === name
        })
      }

      const relPods = byInstance(allPods)
      const relDeploys = byInstance(allDeployments)
      const relSvcs = byInstance(allServices)
      const relIngs = byInstance(allIngresses)

      const podsRunning = relPods.filter((p) => p.status === 'Running').length
      const podsFailed = relPods.filter((p) => FAILED_STATUSES.has(p.status)).length

      let health = 'unknown'
      if (relPods.length > 0) {
        if (podsFailed > 0) health = 'failed'
        else if (relPods.some((p) => PENDING_STATUSES.has(p.status))) health = 'warning'
        else health = 'healthy'
      }

      return {
        key,
        appName: name,
        ns,
        helmRelease: name,
        releaseName: name,
        releaseNamespace: ns,
        chartName: release.chart ?? name,
        helmStatus: release.status ?? 'deployed',
        health,
        counts: {
          pods: relPods.length,
          deployments: relDeploys.length,
          services: relSvcs.length,
          ingresses: relIngs.length,
        },
        podsRunning,
        podsFailed,
      }
    })
    .sort((a, b) => {
      if (a.health === 'failed' && b.health !== 'failed') return -1
      if (b.health === 'failed' && a.health !== 'failed') return 1
      if (a.health === 'warning' && b.health !== 'warning') return -1
      if (b.health === 'warning' && a.health !== 'warning') return 1
      return b.counts.pods - a.counts.pods
    })
}

/**
 * extractExternalRefs
 * Walks pod templates in helmResources to find secrets, configmaps, pvcs,
 * and serviceaccounts that are NOT in the helm-owned set.
 * Returns arrays of { name, ns } for the caller to individually fetch.
 */
export function extractExternalRefs(helmResources) {
  const {
    pods = [],
    deployments = [],
    statefulsets = [],
    daemonsets = [],
    ingresses = [],
    configmaps = [],
    secrets = [],
    pvcs = [],
    serviceaccounts = [],
  } = helmResources

  const ownedSecrets = new Set(secrets.map((r) => r.name))
  const ownedCMs = new Set(configmaps.map((r) => r.name))
  const ownedPVCs = new Set(pvcs.map((r) => r.name))
  const ownedSAs = new Set(serviceaccounts.map((r) => r.name))

  const extSecrets = new Map() // name → ns
  const extCMs = new Map()
  const extPVCs = new Map()
  const extSAs = new Map()

  function scanPodSpec(spec, ns) {
    if (!spec) return
    const sa = spec.serviceAccountName
    if (sa && sa !== 'default' && !ownedSAs.has(sa)) extSAs.set(sa, ns)
    for (const ips of spec.imagePullSecrets ?? []) {
      if (ips.name && !ownedSecrets.has(ips.name)) extSecrets.set(ips.name, ns)
    }
    for (const v of spec.volumes ?? []) {
      if (v.secret?.secretName && !ownedSecrets.has(v.secret.secretName))
        extSecrets.set(v.secret.secretName, ns)
      if (v.configMap?.name && !ownedCMs.has(v.configMap.name)) extCMs.set(v.configMap.name, ns)
      if (v.persistentVolumeClaim?.claimName && !ownedPVCs.has(v.persistentVolumeClaim.claimName))
        extPVCs.set(v.persistentVolumeClaim.claimName, ns)
    }
    for (const c of [...(spec.containers ?? []), ...(spec.initContainers ?? [])]) {
      for (const ef of c.envFrom ?? []) {
        if (ef.secretRef?.name && !ownedSecrets.has(ef.secretRef.name))
          extSecrets.set(ef.secretRef.name, ns)
        if (ef.configMapRef?.name && !ownedCMs.has(ef.configMapRef.name))
          extCMs.set(ef.configMapRef.name, ns)
      }
      for (const env of c.env ?? []) {
        if (env.valueFrom?.secretKeyRef?.name && !ownedSecrets.has(env.valueFrom.secretKeyRef.name))
          extSecrets.set(env.valueFrom.secretKeyRef.name, ns)
        if (
          env.valueFrom?.configMapKeyRef?.name &&
          !ownedCMs.has(env.valueFrom.configMapKeyRef.name)
        )
          extCMs.set(env.valueFrom.configMapKeyRef.name, ns)
      }
    }
  }

  for (const r of pods) {
    scanPodSpec(r.raw?.spec, r.raw?.metadata?.namespace ?? 'default')
  }
  for (const r of [...deployments, ...statefulsets, ...daemonsets]) {
    scanPodSpec(r.raw?.spec?.template?.spec, r.raw?.metadata?.namespace ?? 'default')
  }
  // Ingress TLS secrets
  for (const r of ingresses) {
    const ns = r.raw?.metadata?.namespace ?? 'default'
    for (const tls of r.raw?.spec?.tls ?? []) {
      if (tls.secretName && !ownedSecrets.has(tls.secretName)) extSecrets.set(tls.secretName, ns)
    }
  }

  return {
    secrets: Array.from(extSecrets.entries()).map(([name, ns]) => ({ name, ns })),
    configmaps: Array.from(extCMs.entries()).map(([name, ns]) => ({ name, ns })),
    pvcs: Array.from(extPVCs.entries()).map(([name, ns]) => ({ name, ns })),
    serviceaccounts: Array.from(extSAs.entries()).map(([name, ns]) => ({ name, ns })),
  }
}

/**
 * buildHelmGraph
 * Builds Vue Flow nodes + edges for a single Helm release.
 * helmResources  — resources fetched via the release label selector
 * externalResources — external deps resolved from YAML references
 */
export function buildHelmGraph({
  helmResources = {},
  externalResources = {},
  releaseName,
  releaseNs,
}) {
  const {
    pods = [],
    deployments = [],
    statefulsets = [],
    replicasets = [],
    services = [],
    ingresses = [],
    configmaps = [],
    secrets = [],
    pvcs = [],
    serviceaccounts = [],
  } = helmResources

  const {
    secrets: extSecrets = [],
    configmaps: extConfigmaps = [],
    pvcs: extPVCs = [],
    pvs: extPVs = [],
    serviceaccounts: extServiceAccounts = [],
  } = externalResources

  const nodes = []
  const edges = []
  const edgeSet = new Set()
  const nodeSet = new Set()
  const externalNodeIds = new Set() // tracks nodes outside the Helm group

  function addEdge(source, target, label, opts = {}) {
    const id = `e::${source}::${target}`
    if (edgeSet.has(id)) return
    edgeSet.add(id)
    edges.push({
      id,
      source,
      target,
      label: label || undefined,
      type: 'smoothstep',
      animated: false,
      markerEnd: { type: 'arrowclosed' },
      data: { relation: label, external: opts.external ?? false },
      style: opts.dashed
        ? { strokeDasharray: '5 4', ...(opts.external ? { stroke: '#f97316' } : {}) }
        : undefined,
    })
  }

  // ── Lane layout ──────────────────────────────────────────────────────────
  const workloads = [
    ...deployments.map((r) => ({ r, kind: 'deployment', icon: '/k8s-icons/deploy.svg' })),
    ...statefulsets.map((r) => ({ r, kind: 'statefulset', icon: '/k8s-icons/sts.svg' })),
  ]
  const laneOrder = [
    {
      key: 'ingress',
      items: ingresses.map((r) => ({ r, kind: 'ingress', icon: '/k8s-icons/ing.svg' })),
    },
    {
      key: 'service',
      items: services.map((r) => ({ r, kind: 'service', icon: '/k8s-icons/svc.svg' })),
    },
    { key: 'workload', items: workloads },
    {
      key: 'replicaset',
      items: replicasets.map((r) => ({ r, kind: 'replicaset', icon: '/k8s-icons/rs.svg' })),
    },
    { key: 'pod', items: pods.map((r) => ({ r, kind: 'pod', icon: '/k8s-icons/pod.svg' })) },
  ]
  const activeLanes = laneOrder.filter((l) => l.items.length > 0)

  // Helm-owned config + storage rows
  const helmConfigItems = [
    ...configmaps.map((r) => ({ r, kind: 'configmap', icon: '/k8s-icons/cm.svg' })),
    ...secrets.map((r) => ({ r, kind: 'secret', icon: '/k8s-icons/secret.svg' })),
    ...serviceaccounts.map((r) => ({ r, kind: 'serviceaccount', icon: '/k8s-icons/sa.svg' })),
  ]
  const helmStorageItems = pvcs.map((r) => ({
    r,
    kind: 'persistentvolumeclaim',
    icon: '/k8s-icons/pvc.svg',
  }))

  // ── Group dimensions ─────────────────────────────────────────────────────
  const maxMainNodes = Math.max(1, ...activeLanes.map((l) => l.items.length))
  const mainH = maxMainNodes * (NODE_H + V_GAP) - V_GAP
  const hasConfig = helmConfigItems.length > 0
  const hasStorage = helmStorageItems.length > 0

  let groupInnerH = mainH
  if (hasConfig) groupInnerH += CFG_ROW_GAP + NODE_H
  if (hasStorage) groupInnerH += CFG_ROW_GAP + NODE_H

  const presentColXs = activeLanes.map((l) => COL[l.key]).filter((x) => x !== undefined)
  const rightmostX = presentColXs.length ? Math.max(...presentColXs) : 0
  const cfgRowW = helmConfigItems.length
    ? (helmConfigItems.length - 1) * (NODE_W + H_GAP) + NODE_W
    : 0
  const stoRowW = helmStorageItems.length
    ? (helmStorageItems.length - 1) * (NODE_W + H_GAP) + NODE_W
    : 0
  const groupInnerW = Math.max(rightmostX + NODE_W, cfgRowW, stoRowW)
  const groupW = groupInnerW + GROUP_PAD * 2
  const groupH = HEADER_H + groupInnerH + GROUP_PAD * 2
  const configRowY = HEADER_H + GROUP_PAD + mainH + CFG_ROW_GAP
  const storageRowY = configRowY + (hasConfig ? NODE_H + CFG_ROW_GAP : 0)

  // ── Helm group parent node ────────────────────────────────────────────────
  const groupId = `helm-group/${releaseNs}/${releaseName}`
  nodes.push({
    id: groupId,
    type: 'appGroup',
    position: { x: 0, y: 0 },
    style: { width: `${groupW}px`, height: `${groupH}px` },
    data: { appName: releaseName, ns: releaseNs, helmRelease: releaseName },
  })
  nodeSet.add(groupId)

  // ── Main lane nodes ───────────────────────────────────────────────────────
  const podNodes = []
  const svcNodes = []
  const ingressNodes = []

  for (const lane of activeLanes) {
    lane.items.forEach(({ r, kind, icon }, i) => {
      const name = r.name ?? r.raw?.metadata?.name
      const ns = r.raw?.metadata?.namespace ?? releaseNs
      const id = nid(kind, name, ns)
      nodeSet.add(id)
      nodes.push({
        id,
        type: 'k8sNode',
        parentNode: groupId,
        expandParent: false,
        position: {
          x: GROUP_PAD + COL[lane.key],
          y: HEADER_H + GROUP_PAD + i * (NODE_H + V_GAP),
        },
        data: {
          resourceKind: kind,
          label: name,
          namespace: ns,
          status: r.status ?? 'Unknown',
          icon,
          raw: r.raw,
          resource: r,
        },
      })
      if (lane.key === 'pod') podNodes.push({ id, labels: r.raw?.metadata?.labels ?? {}, ns })
      if (lane.key === 'service') svcNodes.push({ id, selector: r.raw?.spec?.selector ?? {}, ns })
      if (lane.key === 'ingress') ingressNodes.push({ id, ns, rules: r.raw?.spec?.rules ?? [] })
    })
  }

  // ── Config row (helm-owned) ───────────────────────────────────────────────
  helmConfigItems.forEach(({ r, kind, icon }, i) => {
    const name = r.name ?? r.raw?.metadata?.name
    const ns = r.raw?.metadata?.namespace ?? releaseNs
    const id = nid(kind, name, ns)
    nodeSet.add(id)
    nodes.push({
      id,
      type: 'k8sNode',
      parentNode: groupId,
      expandParent: false,
      position: { x: GROUP_PAD + i * (NODE_W + H_GAP), y: configRowY },
      data: {
        resourceKind: kind,
        label: name,
        namespace: ns,
        status: r.status ?? 'Active',
        icon,
        raw: r.raw,
        resource: r,
        configStyle: true,
      },
    })
  })

  // ── Storage row (helm-owned) ──────────────────────────────────────────────
  helmStorageItems.forEach(({ r, kind, icon }, i) => {
    const name = r.name ?? r.raw?.metadata?.name
    const ns = r.raw?.metadata?.namespace ?? releaseNs
    const id = nid(kind, name, ns)
    nodeSet.add(id)
    nodes.push({
      id,
      type: 'k8sNode',
      parentNode: groupId,
      expandParent: false,
      position: { x: GROUP_PAD + i * (NODE_W + H_GAP), y: storageRowY },
      data: {
        resourceKind: kind,
        label: name,
        namespace: ns,
        status: r.raw?.status?.phase ?? r.status ?? 'Unknown',
        icon,
        raw: r.raw,
        resource: r,
        storageStyle: true,
      },
    })
  })

  // ── External nodes (right of the group box) ───────────────────────────────
  const extColX = groupW + EXT_COL_GAP
  const extCol2X = extColX + NODE_W + H_GAP // second column for PVs
  let extY = 0

  function addExternalNode(r, kind, icon) {
    const name = r.name ?? r.raw?.metadata?.name
    const ns = r.raw?.metadata?.namespace ?? releaseNs
    const id = nid(kind, name, ns)
    if (nodeSet.has(id)) return id
    nodeSet.add(id)
    externalNodeIds.add(id)
    nodes.push({
      id,
      type: 'k8sNode',
      position: { x: extColX, y: extY },
      data: {
        resourceKind: kind,
        label: name,
        namespace: ns,
        status: r.raw?.status?.phase ?? r.status ?? 'Active',
        icon,
        raw: r.raw,
        resource: r,
        externalStyle: true,
      },
    })
    return id
  }

  if (extSecrets.length > 0) {
    for (const r of extSecrets) {
      addExternalNode(r, 'secret', '/k8s-icons/secret.svg')
      extY += NODE_H + EXT_V_GAP
    }
    extY += EXT_SEC_GAP
  }
  if (extConfigmaps.length > 0) {
    for (const r of extConfigmaps) {
      addExternalNode(r, 'configmap', '/k8s-icons/cm.svg')
      extY += NODE_H + EXT_V_GAP
    }
    extY += EXT_SEC_GAP
  }
  if (extServiceAccounts.length > 0) {
    for (const r of extServiceAccounts) {
      addExternalNode(r, 'serviceaccount', '/k8s-icons/sa.svg')
      extY += NODE_H + EXT_V_GAP
    }
    extY += EXT_SEC_GAP
  }

  // External PVCs + cascaded PVs (PV goes in column 2, same row as its PVC)
  const pvByName = new Map((extPVs ?? []).map((pv) => [pv.name ?? pv.raw?.metadata?.name, pv]))
  for (const r of extPVCs) {
    const pvcName = r.name ?? r.raw?.metadata?.name
    const pvcNs = r.raw?.metadata?.namespace ?? releaseNs
    const pvcId = nid('persistentvolumeclaim', pvcName, pvcNs)
    const rowY = extY
    addExternalNode(r, 'persistentvolumeclaim', '/k8s-icons/pvc.svg')
    extY += NODE_H + EXT_V_GAP
    const pvName = r.raw?.spec?.volumeName
    if (pvName && pvByName.has(pvName)) {
      const pv = pvByName.get(pvName)
      const pvId = nid('persistentvolume', pvName, '_')
      if (!nodeSet.has(pvId)) {
        nodeSet.add(pvId)
        nodes.push({
          id: pvId,
          type: 'k8sNode',
          position: { x: extCol2X, y: rowY },
          data: {
            resourceKind: 'persistentvolume',
            label: pvName,
            namespace: '(cluster)',
            status: pv.raw?.status?.phase ?? pv.status ?? 'Unknown',
            icon: '/k8s-icons/pv.svg',
            raw: pv.raw,
            resource: pv,
            externalStyle: true,
            storageStyle: true,
          },
        })
      }
      addEdge(pvcId, pvId, 'bound to', { dashed: true, external: true })
    }
  }

  // ── Internal flow edges ───────────────────────────────────────────────────
  // Ingress → Service (HTTP backends)
  for (const { id: ingId, ns: ingNs, rules } of ingressNodes) {
    for (const rule of rules) {
      for (const path of rule.http?.paths ?? []) {
        const svcName = path.backend?.service?.name ?? path.backend?.serviceName
        if (!svcName) continue
        addEdge(ingId, nid('service', svcName, ingNs), '')
      }
    }
  }
  // Ingress → Service (defaultBackend) + Ingress → TLS Secret
  for (const r of ingresses) {
    const ns = r.raw?.metadata?.namespace ?? releaseNs
    const ingId = nid('ingress', r.name ?? r.raw?.metadata?.name, ns)
    const defSvc = r.raw?.spec?.defaultBackend?.service?.name
    if (defSvc) addEdge(ingId, nid('service', defSvc, ns), '')
    for (const tls of r.raw?.spec?.tls ?? []) {
      if (tls.secretName) {
        const secId = nid('secret', tls.secretName, ns)
        addEdge(ingId, secId, 'TLS', { dashed: true })
      }
    }
  }

  for (const { id: svcId, selector, ns: svcNs } of svcNodes) {
    if (!Object.keys(selector).length) continue
    for (const { id: podId, labels, ns: podNs } of podNodes) {
      if (podNs === svcNs && selectorMatches(selector, labels)) addEdge(svcId, podId, '')
    }
  }

  for (const rs of replicasets) {
    const ns = rs.raw?.metadata?.namespace ?? releaseNs
    const rsId = nid('replicaset', rs.name ?? rs.raw?.metadata?.name, ns)
    const owner = (rs.raw?.metadata?.ownerReferences ?? []).find(
      (o) => o.kind === 'Deployment' || o.kind === 'StatefulSet',
    )
    if (owner) addEdge(nid(owner.kind.toLowerCase(), owner.name, ns), rsId, '')
  }

  for (const pod of pods) {
    const ns = pod.raw?.metadata?.namespace ?? releaseNs
    const podName = pod.name ?? pod.raw?.metadata?.name
    const rsOwner = (pod.raw?.metadata?.ownerReferences ?? []).find((o) => o.kind === 'ReplicaSet')
    if (rsOwner) addEdge(nid('replicaset', rsOwner.name, ns), nid('pod', podName, ns), '')
  }

  // Workload / Pod → ConfigMaps, Secrets, PVCs, SAs (dashed — helm-owned + external)
  function edgesFromRaw(raw, sourceId) {
    if (!raw) return
    const ns = raw.metadata?.namespace ?? releaseNs
    const containers = [
      ...(raw.spec?.containers ?? []),
      ...(raw.spec?.initContainers ?? []),
      ...(raw.spec?.template?.spec?.containers ?? []),
      ...(raw.spec?.template?.spec?.initContainers ?? []),
    ]
    for (const c of containers) {
      for (const ef of c.envFrom ?? []) {
        if (ef.configMapRef?.name)
          addEdge(sourceId, nid('configmap', ef.configMapRef.name, ns), '', { dashed: true })
        if (ef.secretRef?.name)
          addEdge(sourceId, nid('secret', ef.secretRef.name, ns), '', { dashed: true })
      }
      for (const env of c.env ?? []) {
        if (env.valueFrom?.configMapKeyRef?.name)
          addEdge(sourceId, nid('configmap', env.valueFrom.configMapKeyRef.name, ns), '', {
            dashed: true,
          })
        if (env.valueFrom?.secretKeyRef?.name)
          addEdge(sourceId, nid('secret', env.valueFrom.secretKeyRef.name, ns), '', {
            dashed: true,
          })
      }
    }
    const vols = raw.spec?.volumes ?? raw.spec?.template?.spec?.volumes ?? []
    for (const v of vols) {
      if (v.configMap?.name)
        addEdge(sourceId, nid('configmap', v.configMap.name, ns), '', { dashed: true })
      if (v.secret?.secretName)
        addEdge(sourceId, nid('secret', v.secret.secretName, ns), '', { dashed: true })
      if (v.persistentVolumeClaim?.claimName)
        addEdge(sourceId, nid('persistentvolumeclaim', v.persistentVolumeClaim.claimName, ns), '', {
          dashed: true,
        })
    }
    const ipSecrets = raw.spec?.imagePullSecrets ?? raw.spec?.template?.spec?.imagePullSecrets ?? []
    for (const s of ipSecrets) {
      if (s.name) addEdge(sourceId, nid('secret', s.name, ns), '', { dashed: true })
    }
    const saName = raw.spec?.serviceAccountName ?? raw.spec?.template?.spec?.serviceAccountName
    if (saName) addEdge(sourceId, nid('serviceaccount', saName, ns), '', { dashed: true })
  }

  for (const r of [...deployments, ...statefulsets]) {
    const ns = r.raw?.metadata?.namespace ?? releaseNs
    const name = r.name ?? r.raw?.metadata?.name
    const kind = r.raw?.kind?.toLowerCase() ?? 'deployment'
    edgesFromRaw(r.raw, nid(kind, name, ns))
  }
  for (const r of pods) {
    edgesFromRaw(
      r.raw,
      nid('pod', r.name ?? r.raw?.metadata?.name, r.raw?.metadata?.namespace ?? releaseNs),
    )
  }

  // ── Style cross-boundary edges to external nodes orange-dashed ────────────
  for (const edge of edges) {
    if (externalNodeIds.has(edge.target) || externalNodeIds.has(edge.source)) {
      edge.style = { strokeDasharray: '5 4', stroke: '#f97316' }
      edge.data = { ...(edge.data ?? {}), external: true }
    }
  }

  // Drop edges that reference non-existent nodes
  return { nodes, edges: edges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target)) }
}
