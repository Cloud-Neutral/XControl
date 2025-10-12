-- =========================================
-- schema_pglogical_region.sql
-- pglogical 双向复制通用配置模板 (PostgreSQL 16+)
-- 通过 psql -v 指定节点相关变量，可用于 CN / Global 等多个区域
-- =========================================

-- 可覆盖的变量：
--   PGLOGICAL_NODE_NAME            本节点名称 (默认: node_cn)
--   PGLOGICAL_NODE_DSN             本节点连接 DSN
--   PGLOGICAL_SUBSCRIPTION_NAME    订阅名称 (默认: sub_from_global)
--   PGLOGICAL_PROVIDER_DSN         对端节点 DSN
--   PGLOGICAL_REPLICATION_SET      复制集名称 (默认: rep_all)

\if :{?PGLOGICAL_NODE_NAME}
\else
\set PGLOGICAL_NODE_NAME 'node_cn'
\endif

\if :{?PGLOGICAL_NODE_DSN}
\else
\set PGLOGICAL_NODE_DSN 'host=cn-homepage.svc.plus port=5432 dbname=account user=pglogical password=StrongPass'
\endif

\if :{?PGLOGICAL_SUBSCRIPTION_NAME}
\else
\set PGLOGICAL_SUBSCRIPTION_NAME 'sub_from_global'
\endif

\if :{?PGLOGICAL_PROVIDER_DSN}
\else
\set PGLOGICAL_PROVIDER_DSN 'host=global-homepage.svc.plus port=5432 dbname=account user=pglogical password=StrongPass'
\endif

\if :{?PGLOGICAL_REPLICATION_SET}
\else
\set PGLOGICAL_REPLICATION_SET 'rep_all'
\endif

-- 🧭 清理旧节点与订阅（可安全重入）
DO $$
BEGIN
  PERFORM pglogical.drop_subscription(:'PGLOGICAL_SUBSCRIPTION_NAME', true);
  EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM pglogical.drop_node(:'PGLOGICAL_NODE_NAME');
  EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================
-- 创建本节点 (Provider)
-- =========================================
SELECT pglogical.create_node(
  node_name := :'PGLOGICAL_NODE_NAME',
  dsn := :'PGLOGICAL_NODE_DSN'
);

-- =========================================
-- 定义复制集
-- =========================================
DO $$
BEGIN
  PERFORM pglogical.drop_replication_set(:'PGLOGICAL_REPLICATION_SET');
  EXCEPTION WHEN others THEN NULL;
END $$;

SELECT pglogical.create_replication_set(:'PGLOGICAL_REPLICATION_SET');
SELECT pglogical.replication_set_add_all_tables(:'PGLOGICAL_REPLICATION_SET', ARRAY['public']);

-- =========================================
-- 创建订阅 (订阅对端节点)
-- =========================================
SELECT pglogical.create_subscription(
  subscription_name := :'PGLOGICAL_SUBSCRIPTION_NAME',
  provider_dsn := :'PGLOGICAL_PROVIDER_DSN',
  replication_sets := ARRAY[ :'PGLOGICAL_REPLICATION_SET' ],
  synchronize_structure := false,
  synchronize_data := true,
  forward_origins := '{}'
);

-- =========================================
-- 验证状态
-- =========================================
-- SELECT * FROM pglogical.show_subscription_status();
-- status = 'replicating' 表示复制成功
-- =========================================
