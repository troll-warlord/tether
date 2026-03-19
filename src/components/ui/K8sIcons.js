/**
 * K8sIcons.js – Official Kubernetes resource icons.
 * SVG files downloaded from the official Kubernetes Icons Set:
 * https://github.com/kubernetes/community/tree/master/icons
 * Helm icon from CNCF artwork: https://github.com/cncf/artwork
 *
 * Icons are served from public/k8s-icons/ as static assets.
 * Each export is a Vue component accepting a `size` prop.
 * Additional resource types without dedicated SVGs use Lucide icons.
 */
import { h } from 'vue'
import { Server, Layers, AlertCircle, Scale, ShieldAlert } from 'lucide-vue-next'

function makeImgIcon(filename) {
  return {
    props: { size: { type: Number, default: 16 } },
    render({ size }) {
      return h('img', {
        src: `/k8s-icons/${filename}.svg`,
        width: size,
        height: size,
        style: 'flex-shrink:0;display:block',
        draggable: 'false',
      })
    },
  }
}

function makeLucideIcon(Component, defaultColor) {
  return {
    props: { size: { type: Number, default: 16 } },
    render({ size }) {
      return h(Component, { size, style: defaultColor ? `color:${defaultColor}` : '' })
    },
  }
}

export const K8sPod = makeImgIcon('pod')
export const K8sDeployment = makeImgIcon('deploy')
export const K8sStatefulSet = makeImgIcon('sts')
export const K8sDaemonSet = makeImgIcon('ds')
export const K8sReplicaSet = makeImgIcon('rs')
export const K8sJob = makeImgIcon('job')
export const K8sCronJob = makeImgIcon('cronjob')
export const K8sService = makeImgIcon('svc')
export const K8sIngress = makeImgIcon('ing')
export const K8sNetworkPolicy = makeImgIcon('netpol')
export const K8sEndpoints = makeImgIcon('ep')
export const K8sPV = makeImgIcon('pv')
export const K8sPVC = makeImgIcon('pvc')
export const K8sStorageClass = makeImgIcon('sc')
export const K8sConfigMap = makeImgIcon('cm')
export const K8sSecret = makeImgIcon('secret')
export const K8sResourceQuota = makeImgIcon('quota')
export const K8sLimitRange = makeImgIcon('limits')
export const K8sServiceAccount = makeImgIcon('sa')
export const K8sRole = makeImgIcon('role')
export const K8sRoleBinding = makeImgIcon('rb')
export const K8sClusterRole = makeImgIcon('c-role')
export const K8sClusterRoleBinding = makeImgIcon('crb')
export const K8sHelm = makeImgIcon('helm')

// Resources without dedicated SVG icons — use Lucide
export const K8sHPA = makeLucideIcon(Scale, '#60a5fa')
export const K8sPDB = makeLucideIcon(ShieldAlert, '#f97316')
export const K8sNamespace = makeLucideIcon(Layers, '#a78bfa')
export const K8sNode = makeLucideIcon(Server, '#4ade80')
export const K8sEvent = makeLucideIcon(AlertCircle, '#fbbf24')
