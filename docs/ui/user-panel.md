# User Panel

Pages include config export, usage stats, node list.

🧩 User Panel 功能细节（租户端）
功能	描述
查看订阅配置	生成 vless:// 链接和二维码，支持复制和扫码导入
使用量展示	上/下行总流量、小时图表（来源于 stats 或 DeepFlow）
可用节点列表	展示地区、协议类型、连接状态，支持筛选和复制配置


✅ User Panel 功能细节（面向租户用户）
1. 🔑 配置导出（vless:// 链接 + QRCode）
展示用户当前 UUID + email 生成的 VLESS URL；

点击按钮可复制 vless:// 链接；

自动生成二维码供扫码导入；

支持一键导入到 v2rayN/v2rayNG 的格式。

示例：

bash
vless://UUID@domain.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.cloudflare.com&fp=chrome&pbk=公钥&sid=shortid&type=tcp#email
2. 📊 当前使用量
展示用户当前累计上传 / 下载（单位：MB/GB）；

可视化图表：过去 24 小时 / 7 天 流量变化；

查询来源：通过控制器后台定期采集 Xray API 流量（stats service）并入库；

用户只能查看自己数据（通过 JWT 登录或 UUID token）。

3. 🛰️ 可用节点列表
用户可查看所有可使用的出口节点（Node）；

每个节点显示：

节点名（如 Japan #1, US-A）

节点状态（在线 / 延迟 / 负载）

支持的传输方式（WS, gRPC, Reality 等）

点击可选择订阅该节点配置或切换节点（如生成特定配置链接）

🖼️ 前端界面模块（建议 Vue 组件）
页面组件	说明
MyConfig.vue	展示 vless:// 链接 + 二维码 + 复制
MyUsage.vue	图表 + 使用量（来自 stats）
MyNodes.vue	节点列表 + Ping 状态 + 一键切换

🔐 用户访问安全建议
每个用户访问面板需提供 Token / UUID + email 组合；

前端通过 Token 获取绑定账号信息（禁用查看他人）；

可选 JWT 登录或 “邮箱+验证码” 快速访问方式。
