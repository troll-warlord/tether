<div align="center">
  <h1>⚓ tether</h1>
  <p><strong>A lightweight, browser-based Kubernetes dashboard</strong></p>
  <p>
    <a href="https://github.com/troll-warlord/tether/actions/workflows/deploy.yml">
      <img src="https://github.com/troll-warlord/tether/actions/workflows/deploy.yml/badge.svg" alt="Deploy" />
    </a>
    <a href="https://github.com/troll-warlord/tether/actions/workflows/ci.yml">
      <img src="https://github.com/troll-warlord/tether/actions/workflows/ci.yml/badge.svg" alt="CI" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" />
    </a>
    <a href="https://github.com/troll-warlord/tether/releases">
      <img src="https://img.shields.io/github/v/release/troll-warlord/tether" alt="Release" />
    </a>
  </p>
</div>

---

## What is tether?

**tether** is a read-friendly Kubernetes dashboard that runs entirely in the browser.
It connects directly to any `kubectl proxy` endpoint — no backend server, no cluster-side install.

**Key highlights:**

- 🗂 **Full resource browser** — all standard resource types with kubectl-style columns, YAML view, and copy
- 🔭 **Helm application graph** — visual dependency graph scoped to a Helm release, including references to external secrets, configmaps, PVCs, and service accounts your chart doesn't own
- 📊 **Overview dashboard** — pod/deployment/service health charts at a glance
- 📜 **Log streaming** — tail pod logs with container selection
- 🔐 **Secret decode** — base64-decode secret values inline
- 🌙 **Light / dark theme** — follows your OS preference, toggleable

---

## Quick start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| kubectl | any recent |
| A running Kubernetes cluster | — |

### 1 — Start `kubectl proxy`

```bash
kubectl proxy --port=8001
```

### 2 — Run tether

```bash
git clone https://github.com/troll-warlord/tether.git
cd tether
npm install
npm run dev
```

Open **http://localhost:5173** and enter `http://localhost:8001` as the API URL.

---

## Architecture

```
Browser → kubectl proxy → Kubernetes API server
```

tether communicates with the Kubernetes API server exclusively through the standard `kubectl proxy` — there is no backend, no credentials stored outside your machine, and no telemetry.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI framework | Vue 3 (Composition API) |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v3 |
| State management | Pinia |
| Graph visualisation | Vue Flow |
| Charts | Chart.js + vue-chartjs |
| Icons | Lucide Vue + official K8s SVG icon set |

---

## Supported resources

| Group | Resources |
|-------|-----------|
| Workloads | Pods, Deployments, StatefulSets, DaemonSets, ReplicaSets, Jobs, CronJobs, HPAs, PodDisruptionBudgets |
| Network | Services, Ingresses, NetworkPolicies, Endpoints |
| Storage | PersistentVolumes, PersistentVolumeClaims, StorageClasses |
| Configuration | ConfigMaps, Secrets, ResourceQuotas, LimitRanges |
| Access Control | ServiceAccounts, Roles, RoleBindings, ClusterRoles, ClusterRoleBindings |
| Cluster | Namespaces, Nodes, Events |
| Helm | Helm Releases (via `helm.sh/release.v1` secrets) |

---

## Development

```bash
npm run dev          # start dev server with kubectl proxy passthrough
npm run build        # production build
npm run lint         # ESLint check (exits non-zero on warnings)
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format all src files
npm run format:check # Prettier check (used in CI)
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE) © Tarun Pable

