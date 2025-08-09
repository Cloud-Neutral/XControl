# PostgreSQL + pgvector 初始化指南

本文档介绍在 macOS 上初始化 PostgreSQL 并启用 [pgvector](https://github.com/pgvector/pgvector) 扩展，以便项目的向量检索功能正常运行。

## 1. 初始化数据库集群
1. 停止可能运行的 PostgreSQL 服务，避免与初始化过程冲突：
   ```bash
   brew services stop postgresql
   ```
2. 初始化数据目录并创建超级用户，这里以 `shenlan` 为例：
   ```bash
   initdb /opt/homebrew/var/postgres -U shenlan -W
   ```
   - `-U` 指定初始化时创建的超级用户名称，可根据需要替换为其它名字（如 `postgres`）。
   - `-W` 会提示输入该用户的密码。

## 2. 启动服务并创建业务数据库
1. 启动 PostgreSQL 服务：
   ```bash
   brew services start postgresql
   ```
2. 使用初始化时创建的用户连接到默认的 `postgres` 数据库：
   ```bash
   psql -h 127.0.0.1 -U shenlan -d postgres
   ```
3. 在 `psql` 中创建业务数据库（例如 `mydb`）：
   ```sql
   CREATE DATABASE mydb;
   ```

## 3. 安装并启用 pgvector 扩展
1. 安装 pgvector：
   ```bash
   brew install pgvector
   ```
2. （重新）启动 PostgreSQL 以加载扩展：
   ```bash
   brew services restart postgresql
   ```
3. 在目标数据库中启用 pgvector 扩展：
   ```bash
   psql -h 127.0.0.1 -U shenlan -d mydb -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

## 4. 导入项目提供的初始化脚本
项目在 `docs/init.sql` 中提供了建表及索引脚本，可通过 `psql` 导入：
```bash
psql -h 127.0.0.1 -U shenlan -d mydb -f docs/init.sql
```
该脚本会：
- 创建 `vector` 扩展（若尚未启用）。
- 创建存储文档及其向量的 `documents` 表。
- 为向量检索和 JSONB 元数据建立索引。

## 5. 测试连接
确认数据库与扩展均正常工作：
```bash
psql postgres://shenlan:<密码>@127.0.0.1:5432/mydb -c "\d+ documents"
```
若能看到 `embedding | vector(1536)` 字段，说明 pgvector 已成功启用。

完成以上步骤后，应用即可通过连接串 `postgres://shenlan:<密码>@127.0.0.1:5432/mydb` 使用数据库。
