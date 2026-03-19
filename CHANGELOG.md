# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-01-01

### Added

- **Resource browser** — view, filter, and inspect all standard Kubernetes resource types with kubectl-style column layout
- **YAML viewer** — full YAML representation for any resource with one-click clipboard copy
- **Helm application graph** — visual dependency graph scoped to a Helm release using Vue Flow; external references (secrets, configmaps, PVCs, service accounts) detected automatically
- **Overview dashboard** — health charts (pods, deployments, services) built with Chart.js
- **Log streaming** — tail pod logs with container selector and auto-scroll
- **Secret decode** — reveal base64-decoded secret values inline
- **Namespace selector** — switch between namespaces or view all at once
- **Light / dark theme** — follows OS preference with manual toggle
- **Connect screen** — configure API server URL (defaults to `http://localhost:8001`)
- **ESLint + Prettier** — enforced code style with CI checks
- **GitHub Actions** — deploy to GitHub Pages on push to `main`; lint + build check on pull requests
