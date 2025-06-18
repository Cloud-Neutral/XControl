# Design Framework

This document outlines the high level design of **XControl** and how the project uses a collection of open source components, provided as optional extension modules, to build a multi-tenant, multi-service platform.

## Open Source Components

- **PulumiGo** is used to provision cloud resources across multiple providers using the Pulumi SDK with Go.
- **KubeGuard** provides Kubernetes cluster application backups and node-level recovery.
- **CraftWeave** orchestrates lightweight tasks and configuration changes for each service module.
- **CodePRobot** automates GitHub Issue to Pull Request workflows and assists with code patching.
- **OpsAgent** offers intelligent monitoring, anomaly detection and root cause analysis.
- **XStream** accelerates developer connectivity across regions.
These extension modules can be enabled individually, letting deployments choose only the features they need.

### Component Integration Status

| Component | Status |
|-----------|--------|
| PulumiGo | Planned |
| KubeGuard | Planned |
| CraftWeave | Planned |
| CodePRobot | Planned |
| OpsAgent | Planned |
| XStream | Planned |

## Core Design Principles

1. **Multi-Tenant** – users are isolated in data and configuration while sharing the same control plane.
2. **Multi-Service** – each component runs as an independent service that can be enabled or disabled per tenant.
3. **Multi-Node Control** – agents deployed on nodes pull configuration, report usage and manage local services.
4. **Subscription Configuration** – users export service configs (such as `vless://` links) via a unified API.
5. **Modular Visual Panel** – the web UI is built from modules so features can be added as needed.

These principles allow XControl to scale from a single deployment to a complex environment spanning multiple clouds and Kubernetes clusters.
