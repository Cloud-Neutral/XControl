# XControl

XControl is a modular multi-tenant management platform written in Go. The project integrates several optional components to provide a visual control plane for traffic statistics, configuration export and multi-node management.

This repository contains the API server, agent code and a Next.js-based UI.

## Components

- **ui-homepage**
- **ui-panel**
- **xcontrol-cli**
- **xcontrol-server**

All UI components provide both Chinese and English interfaces.

## Tech Stack

| Category  | Technology | Version |
|-----------|------------|---------|
| Framework | Go         | 1.24    |
| Framework | Next.js    | 14.1.0  |
| Gateway   | OpenResty  | 1.27.1.2 |
| Database  | PostgreSQL + pgvector | N/A |
| Cache     | Redis      | N/A     |
| Model     | Large Language Models via CodePRobot | N/A |

## Supported Platforms

Tested on **Ubuntu 22.04 x64** and **macOS 26 arm64**.

## Installation

```bash
make install
make init-db   # initialize database (optional)
```

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

## Deployment

```bash
make start
```

This launches the server, homepage and panel. Use `make stop` to stop all components.

The API server also accepts a custom configuration file:

```bash
xcontrol-server --config path/to/server.yaml
```

## Logging

Both `xcontrol-cli` and `xcontrol-server` accept a `--log-level` flag to control verbosity. The level may be one of `debug`, `info`, `warn`, or `error`:

```bash
xcontrol-cli --log-level debug
xcontrol-server --log-level warn
```

The server's log level can also be set in the configuration file:

```yaml
log:
  level: info
```

The flag value takes precedence over the configuration file.

## Changelog

See [docs/changelog.md](./docs/changelog.md) for a list of completed changes, including all work from Milestone&nbsp;1.

## Roadmap

The roadmap below is also available in [docs/Roadmap.md](./docs/Roadmap.md).

### Milestone 1: MVP (Completed)
- Use default Redis port (#98) and establish PostgreSQL & Redis baseline.
- Stream RAG sync progress for GitHub repository synchronization (#100).
- Add client-side Markdown parsing to the CLI (#104).
- Refactor RAG ingestion into the CLI with a server upsert endpoint (#103).
- RAG API functional tests and per-file ingestion workflow (#115).
- Allow RAG upsert to migrate embedding dimensions (#119) and document pgvector initialization (#120).
- Ingest files automatically (#123).

### Milestone 2: Hybrid Search
- CLI and server dynamically support 1024-dimensional embeddings.
- Update docs and configs to vector(1024) (#130).
- Add embedding configuration fields (#131).
- Add RAG API integration tests for vectors (#132).
- Add allama support (#136).
- Deploy homepage via rsync from CI and fix SSH directory creation (#18, #19).
- Deploy XControl panel via GitHub Actions (#20).
- Fix yarn lock context concatenation (#21).

### Milestone 3: Production Monitoring & Optimization
- Switch server and CLI to Cobra (#133).
- Add repo sync proxy configuration (#135).
- Allow custom AskAI timeout (#141).
- Add log level support to CLI and server and log AskAI errors (#125, #140).
- Continue performance optimization, error handling, multi-model support, permission control, hot reload, and improve RAG upsert docs (#129).

## License

This project is licensed under the terms of the [MIT License](./LICENSE).
