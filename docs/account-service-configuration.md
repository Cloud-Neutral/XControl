# Account Service 配置指南

本文档说明账号服务可用的配置项、加载顺序以及示例，方便在不同环境中快速调整运行参数。

## 1. 配置加载策略

当前服务入口（`account/cmd/accountsvc/main.go`）直接创建 Gin 引擎并注册路由，尚未接入统一的配置加载逻辑。【F:account/cmd/accountsvc/main.go†L1-L12】

为满足生产需求，建议按以下优先级加载配置：

1. **命令行参数**：覆盖性最高，用于临时指定端口或配置文件路径。
2. **环境变量**：适用于容器化部署，通过 `ACCOUNT_*` 前缀管理。
3. **配置文件**：默认从 `config/account.yaml` 或 `config/account.json` 中读取。
4. **内置默认值**：在 `account/config/config.go` 中定义结构体并赋予默认值，保证在缺省配置下仍可运行。【F:account/config/config.go†L1-L5】

## 2. 建议的配置结构

未来扩展时，可按以下结构扩充 `Config`：

```yaml
server:
  addr: ":8080"
  readTimeout: 10s
  writeTimeout: 10s
  idleTimeout: 60s

store:
  driver: "memory"   # 可选：memory、postgres、mysql
  dsn: "postgres://user:pass@host:5432/account?sslmode=disable"
  maxOpenConns: 20
  maxIdleConns: 5
  connMaxLifetime: 30m

session:
  ttl: 24h
  cache: "memory"   # 可选：memory、redis
  redis:
    addr: "redis:6379"
    password: ""
    db: 0

authProviders:
  - name: "oidc"
    issuer: "https://idp.example.com"
    clientID: "xcontrol"
    clientSecret: "${OIDC_CLIENT_SECRET}"
  - name: "ldap"
    addr: "ldap://ldap.example.com:389"
    baseDN: "dc=example,dc=com"
    bindDN: "cn=admin,dc=example,dc=com"
    bindPassword: "${LDAP_BIND_PASSWORD}"
```

## 3. 环境变量示例

| 变量名 | 说明 | 示例 |
| ------ | ---- | ---- |
| `ACCOUNT_SERVER_ADDR` | 服务监听地址 | `:8080` |
| `ACCOUNT_STORE_DRIVER` | 存储驱动类型 | `postgres` |
| `ACCOUNT_STORE_DSN` | 存储连接串 | `postgres://user:pass@db:5432/account` |
| `ACCOUNT_SESSION_TTL` | 会话有效期（秒或 Go duration） | `24h` |
| `ACCOUNT_REDIS_ADDR` | Redis 地址（当 cache=redis 时使用） | `redis:6379` |
| `ACCOUNT_LOG_LEVEL` | 日志级别 | `info` |

在容器或 CI/CD 中，可借助 Secret/ConfigMap 注入敏感值，避免直接写入镜像。

## 4. 配置示例

### 4.1 开发环境

```yaml
server:
  addr: ":8080"

store:
  driver: "memory"

session:
  ttl: 24h
  cache: "memory"
```

### 4.2 测试/预生产环境

```yaml
server:
  addr: ":8080"
  readTimeout: 15s
  writeTimeout: 15s

store:
  driver: "postgres"
  dsn: "postgres://acct:acctpass@postgres:5432/account?sslmode=disable"
  maxOpenConns: 30
  maxIdleConns: 10

session:
  ttl: 24h
  cache: "redis"
  redis:
    addr: "redis:6379"
    password: "${REDIS_PASSWORD}"

authProviders:
  - name: "oidc"
    issuer: "https://idp-pre.example.com"
    clientID: "xcontrol"
    clientSecret: "${OIDC_SECRET}"
```

## 5. 配置校验与回滚

- 在服务启动时验证必需字段是否填写，例如当 `driver=postgres` 时必须提供 `dsn`。
- 提供配置热加载或版本化策略，例如通过 GitOps 将配置存储于仓库，变更可回滚。
- 通过单元测试验证不同配置组合的解析结果，确保新字段向下兼容。

## 6. 与代码协同

- 在 `account/api` 中读取 `session.ttl` 替换硬编码的 `24 * time.Hour`，实现配置化。【F:account/api/api.go†L18-L171】
- 在 `account/internal/store` 中根据 `store.driver` 实例化不同实现，实现从内存到数据库的无缝切换。【F:account/internal/store/store.go†L31-L109】
- 在 `account/internal/auth` 中根据 `authProviders` 列表注册外部认证方式，实现多身份源并行校验。【F:account/internal/auth/auth.go†L1-L6】

---
随着服务演进，应持续完善 `Config` 结构与加载逻辑，并在此文档中同步更新字段说明。
