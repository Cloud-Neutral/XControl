# Data Flow

Explain how traffic, configs, and subscriptions flow through the system.

数据模型设计（PostgreSQL 简化版）
users 表
字段	类型	说明
id	UUID	用户 UUID（VLESS使用）
email	TEXT	用户识别标识
level	INT	对应 policy.level
active	BOOLEAN	是否启用
upload	BIGINT	累计上行流量
download	BIGINT	累计下行流量
expire_at	TIMESTAMP	到期时间（可空）


nodes 表（支持多节点）
字段	类型	说明
id	UUID	节点唯一 ID
name	TEXT	展示用名称
location	TEXT	地区
protocols	TEXT[]	支持的传输方式（ws, grpc）
address	TEXT	连接地址
available	BOOLEAN	是否可用
