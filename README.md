# XControl

XControl is a modular multi-tenant management platform written in Go. The project integrates several optional components to provide a visual control plane for traffic statistics, configuration export and multi-node management.

This repository contains the API server, agent code and a Vue based UI.

## Features
- **XCloudFlow** Multi-cloud IaC engine built with Pulumi SDK and Go. GitHub →
- **KubeGuard** Kubernetes cluster application and node-level backup system. GitHub →
- **XConfig** Lightweight task execution & configuration orchestration engine. GitHub →
- **CodePRobot** AI-driven GitHub Issue to Pull Request generator and code patching tool. GitHub →
- **OpsAgent** AIOps-powered intelligent monitoring, anomaly detection and RCA. GitHub →
- **XStream** Cross-border developer proxy accelerator for global accessibility. GitHub →

The [docs](./docs) directory contains a more detailed [overview](./docs/overview.md) and design documents for each module.

## Building
```
make build
```
This produces a binary under `bin/xcontrol`. Run `make agent` to build the node agent.

## Testing
```
make test
```

## License

This project is licensed under the terms of the [MIT License](./LICENSE).
