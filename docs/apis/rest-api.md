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

## Admin Permission Settings

### GET /api/auth/admin/settings

返回当前的权限矩阵配置，仅对 `admin` 与 `operator` 角色开放。响应结构：

```json
{
  "version": 1,
  "modules": {
    "analytics": {
      "admin": true,
      "operator": false
    }
  }
}
```

`version` 字段可用于并发控制，`modules` 为模块键到角色布尔标识的映射。

### POST /api/auth/admin/settings

更新权限矩阵配置，仅对 `admin` 与 `operator` 角色开放。请求体需携带当前 `version`，服务端在成功写入后会递增版本号；若版本不匹配将返回 `409 Conflict`。

```json
{
  "version": 0,
  "modules": {
    "analytics": {
      "admin": true,
      "operator": false
    },
    "billing": {
      "admin": true,
      "operator": true
    }
  }
}
```

更新成功返回新的 `version` 与标准化后的矩阵结构。模块键、角色键会被自动转为小写并去除首尾空格。
