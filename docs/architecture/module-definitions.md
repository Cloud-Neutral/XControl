# Module Definitions

Define core components: controller, agents, web panel.

🧩 模块说明
模块	功能
- 用户面板	提供订阅配置导出、流量图表、可用节点展示
- 控制器后端	Go 编写，提供 REST API，管理用户/节点/策略，控制节点配置
- 数据库	PostgreSQL 存储用户、节点、流量等业务数据
- 多节点 Agent	拉取配置并重启 Xray、采集流量（Xray stats 或 DeepFlow）
- Web 面板	Vue3 + TailwindCSS，内嵌至 Go 二进制


模块拆分建议（Go）

internal/
├── api/              # Gin API 实现
├── model/            # GORM 数据模型
├── service/          # 用户管理、节点控制逻辑
├── xray/             # 配置渲染与下发、stats 流量采集
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
