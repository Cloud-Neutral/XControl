# Module Definitions

Define core components: controller, agents, web panel.

🧩 模块说明
模块	功能
- 用户面板	提供订阅配置导出、流量图表、可用节点展示
- 控制器后端	Go 编写，提供 REST API，管理用户/节点/策略，控制节点配置
- 数据库	PostgreSQL 存储用户、节点、流量等业务数据
- 多节点 Agent	拉取配置并重启 Xray、采集流量（Xray stats 或 DeepFlow）
- Web 面板	Vue3 + TailwindCSS，内嵌至 Go 二进制
## 开源扩展模块

以下组件可按需启用，集成状态如下：

| 模块 | 功能 | 集成状态 |
| ---- | ---- | ---- |
| PulumiGo | 多云基础设施自动化 | 计划集成 |
| KubeGuard | K8s 集群备份与恢复 | 计划集成 |
| CraftWeave | 任务执行与配置编排 | 计划集成 |
| CodePRobot | Issue 到 PR 自动化 | 计划集成 |
| OpsAgent | 智能监控与异常分析 | 计划集成 |
| XStream | 开发者跨境代理加速 | 计划集成 |

模块拆分建议（Go）

internal/
├── api/              # Gin API 实现
├── model/            # GORM 数据模型
├── service/          # 用户管理、节点控制逻辑
├── agent/            # 多节点配置管理逻辑
├── subscription/     # vless:// 链接生成器
├── stats/            # 统一流量处理器（xray or deepflow）

📌 模块说明
✅ 用户面
通过浏览器访问 WebUI；

获取订阅信息、流量使用情况；

支持扫码/复制/查看节点；

✅ 控制面
Go 实现的后端服务（vless-admin）；

管理用户、策略、节点；

提供 REST API 和订阅地址；

内嵌 Vue3 面板、连接 PostgreSQL、采集多节点流量；

✅ 多节点
每个节点部署 Xray + Agent；

Agent 负责：

拉取配置文件；

上报 UUID 使用流量；

定期向控制面同步状态；

Xray 开启 stats + api；

每个节点可支持不同出口、地域、性能策略
