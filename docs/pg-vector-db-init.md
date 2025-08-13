# PostgreSQL + pgvector 初始化指南

本文档介绍在 macOS 上初始化 PostgreSQL 并启用 [pgvector](https://github.com/pgvector/pgvector) 扩展，以便项目的向量检索功能正常运行。

## 3. 安装并启用 pgvector 扩展
1. 安装 pgvector：
   ```bash
   brew install pgvector
   ```
2. （重新）启动 PostgreSQL 以加载扩展：
   ```bash
   brew services restart postgresql

## 初始化数据库集群

1. 停止可能运行的 PostgreSQL 服务，避免与初始化过程冲突：

   brew services stop postgresql
   ```
2. 初始化数据目录并创建超级用户，这里以 `shenlan` 为例：
   ```bash
   initdb /opt/homebrew/var/postgres -U shenlan -W

   - `-U` 指定初始化时创建的超级用户名称，可根据需要替换为其它名字（如 `postgres`）。
   - `-W` 会提示输入该用户的密码。

## 2. 启动服务并创建业务数据库

1. 启动 PostgreSQL 服务：
   ```bash
   brew services start postgresql
   ```
2. 使用初始化时创建的用户连接到默认的 `postgres` 数据库(用一个有权限的用户登录 Linux通常是 postgres 管理员）

  psql -h 127.0.0.1 -U shenlan -d postgres
   ```
3. 在 `psql` 中创建业务数据库（例如 `mydb`）：

   CREATE DATABASE mydb;
   ```
4. 创建数据库和用户（如果还没有）

-- 创建用户（如果已存在可跳过）
CREATE USER shenlan WITH PASSWORD '你的密码';

-- 创建数据库并指定所有者
CREATE DATABASE shenlan OWNER shenlan;

-- 给用户赋权限（可选）
GRANT ALL PRIVILEGES ON DATABASE shenlan TO shenlan;

5. 在目标数据库中启用 pgvector 扩展：
   ```bash
   psql -h 127.0.0.1 -U shenlan -d shenlan -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

6. 导入项目提供的初始化脚本

项目在 `docs/init.sql` 中提供了建表及索引脚本，可通过 `psql` 导入：
```bash
退出再用 shenlan 用户运行 init.sql

psql -h 127.0.0.1 -U shenlan -d shenlan -f docs/init.sql
```
该脚本会：
- 创建 `vector` 和 `zhparser` 扩展（如未启用）。
- 定义混合中文/英文的全文搜索配置 `zhcn_search`。
- 创建 `documents` 表，并包含：
  - 预计算 `doc_key` 生成列（repo:path:chunk_id）。
  - `content_tsv` 生成列支持中文/英文全文检索。
  - `embedding` VECTOR(1024) 字段适配 BGE-M3。
- 建立 `HNSW` 向量索引、`GIN` 全文索引以及 `(repo, path)` 复合索引。

### 示例：UPSERT 与 Hybrid 检索
插入或更新文档：
```sql
INSERT INTO public.documents (
  repo, path, chunk_id, content, embedding, metadata, content_sha
) VALUES (
  'docs', 'README.md', 1, '内容...', '[...]', '{}', 'abc123'
)
ON CONFLICT (doc_key) DO UPDATE
SET
  content = EXCLUDED.content,
  embedding = EXCLUDED.embedding,
  metadata = EXCLUDED.metadata,
  content_sha = EXCLUDED.content_sha,
  updated_at = now();
```

Hybrid 检索：
```sql
SELECT *
FROM public.documents
WHERE content_tsv @@ to_tsquery('zhcn_search', '大模型 & 应用')
  AND embedding IS NOT NULL
ORDER BY embedding <#> '[...]'
LIMIT 5;
```

## 5. 测试连接
确认数据库与扩展均正常工作：
```bash
psql postgres://shenlan:<密码>@127.0.0.1:5432/mydb -c "\d+ documents"
```
若能看到 `embedding | vector(1024)` 字段，说明 pgvector 已成功启用。

完成以上步骤后，应用即可通过连接串 `postgres://shenlan:<密码>@127.0.0.1:5432/mydb` 使用数据库。

## 6. 配置嵌入服务

在 `server/config/server.yaml` 中新增 `embedding` 配置，使服务端能够对问题进行向量化检索：

```yaml
global:
  embedding:
    base_url: http://127.0.0.1:11434
    token: ""
    dimension: 1536
```

其中 `dimension` 需与所使用的嵌入模型返回的向量维度一致。


# 常用检查命令

- 查看总条数:           SELECT COUNT(*) FROM documents;
- 查看前几条数据        SELECT * FROM documents LIMIT 5;
- 只看主要字段          SELECT id, repo, path, chunk_id FROM documents LIMIT 10;
- 查看嵌入向量的维度    SELECT id, vector_dims(embedding) AS dims FROM documents LIMIT 5;
- 确认带向量的记录      SELECT COUNT(*) FROM public.documents WHERE embedding IS NOT NULL;
- 查看向量维度

SELECT id, vector_dims(embedding) AS dims
FROM public.documents
WHERE embedding IS NOT NULL
LIMIT 5;

vector_dims() 是 pgvector 提供的函数


查看全部（注意可能很长）
SELECT content
FROM public.documents;

2. 只看前几条
SELECT id, content
FROM public.documents
LIMIT 5;

3. 只看前 80 个字符（避免太长）
SELECT id, LEFT(content, 80) AS preview
FROM public.documents
LIMIT 5;
这样会输出 content 的前 80 个字符，方便快速浏览。

4. 随机抽查几条

SELECT id, LEFT(content, 80) AS preview
FROM public.documents
ORDER BY random()
LIMIT 5;

5. 同时查看 embedding 维度和 content

SELECT id,
       vector_dims(embedding) AS dims,
       LEFT(content, 80) AS preview
FROM public.documents
ORDER BY random()
LIMIT 5;
这样能一次确认：

向量维度（是不是 1024）

文本内容大致是什么



