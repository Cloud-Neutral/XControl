# REST API Design

## GET /api/users
Returns list of users.


🔗 REST API 接口设计（Gin）
方法	路径	功能描述
GET	/api/users	获取用户列表
POST	/api/users	创建新用户
GET	/api/users/:id/stats	获取单用户流量
GET	/api/users/:id/sub	获取订阅链接（vless://）
GET	/api/nodes	获取所有节点
POST	/api/nodes/:id/ping	测试指定节点状态
