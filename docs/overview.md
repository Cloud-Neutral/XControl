# XControl Overview

XControl is a multi-tenant, multi-service management platform. The project integrates several open source components as optional extension modules to provide a modular and visual administration experience:

- **PulumiGo** – Multi-cloud IaC engine built with Pulumi SDK and Go.
- **KubeGuard** – Kubernetes cluster application and node-level backup system.
- **CraftWeave** – Lightweight task execution & configuration orchestration engine.
- **CodePRobot** – AI-driven GitHub Issue to Pull Request generator and code patching tool.
- **OpsAgent** – AIOps-powered intelligent monitoring, anomaly detection and RCA.
- **XStream** – Cross-border developer proxy accelerator for global accessibility.

项目名称：XControl
一个面向多租户、多服务设计，具备多节点控制、用户订阅配置导出、流量统计与模块化可视化管理面板的系统。

📁 项目结构（Go）

```
xcontrol/
├── cmd/
│   ├── api/            # 启动 HTTP 服务
│   └── cli/            # 可选 CLI 工具
├── internal/
│   ├── model/          # GORM 模型
│   ├── api/            # Gin 路由控制器
│   ├── service/        # 核心业务逻辑
│   └── stats/          # 流量采集整合模块
├── webui/              # Vue 前端
├── deploy/
│   ├── helm/           # Helm Chart
│   └── docker-compose.yml
└── README.md
```

🧩 如何工作？

```
[Client (vless://)]
      ↓
[Xray-core (node)]
      ↓   ← DeepFlow eBPF + WASM 插件监听所有 TCP/UDP
[deepflow-agent]
      ↓
[解析 SNI / UUID / Email / IP / TLS fingerprint]
      ↓
[上报到 Controller → PostgreSQL / Prometheus]

``

🔧 关键功能实现规划（Go）
1. 配置生成与重载
渲染 xray-config.json

写入节点工作目录

调用 systemd restart 或 xray api reload

2. 流量采集
定时调 stats.QueryStats() 获取流量

解析 email → 用户绑定

存入 PostgreSQL 中的 usage 表

3. 配置导出（订阅）
组合 vless:// URL 参数

支持 Reality 公钥/ShortID 解析

渲染二维码（SVG 或 Base64）


核心功能对照 x-ui

核心功能对照 x-ui
功能	x-ui 实现	XControl 实现
多用户 UUID 管理	✅ 本地 DB	✅ PostgreSQL + REST API
订阅配置导出	✅ 面板中手动复制	✅ 自动生成 + QR + 一键导入
节点多出口策略	⚠️ 手动维护节点配置	✅ 每节点注册 + 出站策略可视控制
流量统计	✅ 基于 Xray stats	✅ 支持 stats + DeepFlow 双通道
WebUI + 后端整合	✅ 前后端集成	✅ Go embed Vue，可做 SaaS 化
可观测性 + 控制分离	❌ 不支持	✅ 支持 Agent 拉取或观察方式

## Init DB

export PG_DSN="postgres://shenlan@127.0.0.1:5432/postgres"
make init-db
