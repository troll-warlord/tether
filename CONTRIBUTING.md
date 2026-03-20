# Contributing to tether

Thank you for your interest in contributing! This document explains how to get the project running locally, the coding conventions we follow, and the pull request process.

---

## Table of contents

- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Coding standards](#coding-standards)
- [Commit conventions](#commit-conventions)
- [Pull request process](#pull-request-process)
- [Reporting issues](#reporting-issues)

---

## Getting started

### Prerequisites

- **Node.js ≥ 18** (check with `node -v`)
- **npm ≥ 9** (bundled with Node 18+)
- A running Kubernetes cluster accessible via `kubectl proxy`

### Local setup

```bash
# 1. Fork and clone the source branch
git clone https://github.com/<your-username>/tether.git
cd tether

# 2. Install dependencies
npm install

# 3. Start kubectl proxy in another terminal
kubectl proxy --port=8001

# 4. Start the dev server
npm run dev
```

Open http://localhost:5173, enter `http://localhost:8001` as the API URL, and you're in.

---

## Project structure

```
src/
├── api/          # Raw fetch helpers — one file per Kubernetes API group surface
├── components/
│   ├── charts/   # Chart.js-based overview cards
│   ├── graph/    # Vue Flow nodes and graph container
│   ├── layout/   # Sidebar, TopBar
│   ├── resources/# Resource tables, detail panels, YAML/log viewers
│   └── ui/       # Generic re-usable components (StatusBadge, Modal, etc.)
├── composables/  # Vue composables (useResources, useGraphTransformer, …)
├── router/       # Vue Router — hash mode for static hosting
├── stores/       # Pinia stores (connection, namespaces, resources, ui)
├── styles/       # Global CSS variables + Tailwind base
└── views/        # Top-level route views
```

---

## Coding standards

All code is linted with **ESLint** and formatted with **Prettier**. The configuration lives in `eslint.config.js` and `.prettierrc.json`.

Run checks before pushing:

```bash
npm run format:check   # Prettier dry-run
npm run lint           # ESLint (zero warnings allowed)
```

Auto-fix what can be auto-fixed:

```bash
npm run lint:fix
npm run format
```

### Key conventions

- **No `var`** — use `const` or `let`.
- **Composition API** everywhere — no Options API.
- **No `console.log`** in committed code — `console.warn/error` is acceptable for genuine error paths.
- **Single-file components** — keep template, script, and style in one `.vue` file.
- **Tailwind utility classes** over inline styles or component-scoped CSS wherever reasonable.

---

## Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

Examples:

```
feat(graph): add edge highlighting on node hover
fix(logs): prevent duplicate log lines after reconnect
docs: update quick-start instructions
chore: bump eslint-plugin-vue to 9.x
```

---

## Pull request process

1. **Open an issue first** for non-trivial changes so we can discuss the approach.
2. Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
3. Make your changes, following the coding standards above.
4. Ensure the CI checks pass locally:
   ```bash
   npm run format:check
   npm run lint
   npm run build
   ```
5. Open a PR against `main`. Fill in the PR template (what/why/how).
6. Address review feedback, squash if requested.

---

## Reporting issues

Please use [GitHub Issues](https://github.com/troll-warlord/tether/issues). Include:

- Kubernetes version (`kubectl version`)
- Browser + version
- Steps to reproduce
- Expected vs actual behaviour
- Any console errors (F12 → Console)
