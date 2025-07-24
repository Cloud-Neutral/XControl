# XControl

XControl is a modular multi-tenant management platform written in Go. The project integrates several optional components to provide a visual control plane for traffic statistics, configuration export and multi-node management.

This repository contains the API server, agent code and a Vue based UI.

## Features
- **PulumiGo** based infrastructure provisioning
- **KubeGuard** for cluster backup and restore
- **CraftWeave** task orchestration
- **CodePRobot** GitHub automation
- **OpsAgent** monitoring and anomaly detection
- **XStream** cross border proxy acceleration

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
