# 🧭 `ui/homepage` Deno Runtime Migration Plan

**文件路径**：`codex/ui-homepage-deno-migration-plan.md`
**版本**：v1.0
**作者**：Pan Haitao（CloudNative Workshop）
**最后更新**：2025-10-11

---

## 1️⃣ 背景与目标

`ui/homepage` 当前基于 **Next.js 14** 构建与运行，依赖 Node.js（Yarn、Webpack、Vitest 等工具链）。
迁移目标是将其全面改造为 **Deno Runtime 原生项目**，以实现：

- 🌐 统一跨平台运行环境（Deno Deploy、本地 `deno run`、容器）；
- 🚫 摆脱 Node.js 专有依赖；
- ⚙️ 使用原生 ESM 与 Deno API；
- 🔁 保持与现有 Next.js 页面结构、路由逻辑一致；
- 🔒 简化 CI/CD 与运行时部署链。

---

## 2️⃣ Node.js 依赖现状摘要

| 分类 | 文件/模块 | Node 依赖点 |
|------|------------|--------------|
| 构建与运行 | `package.json`, `Makefile`, `start.sh` | Node CLI + Yarn |
| 配置文件 | `next.config.js`, `tailwind.config.js`, `postcss.config.js` | CommonJS + process.env |
| 工具脚本 | `scripts/export-slugs.ts`, `scripts/scan-md.ts` | fs, path, process |
| 运行时 | `lib/download-manifest.ts`, `lib/serviceConfig.ts` | 文件访问 + 环境变量 |
| 测试 | `vitest.config.ts`, `vitest.setup.ts` | Node-only (JSDOM) |

---

## 3️⃣ 迁移总体策略

| 层级 | 目标 | 替代方案 |
|------|------|-----------|
| **构建层** | 移除 Yarn/Node | 使用 `deno.json` 定义 task |
| **运行层** | 替换 fs/path/process | 使用 Deno API |
| **部署层** | Dockerfile & systemd | 使用 `denoland/deno` 镜像和 `deno run` |

---

## 4️⃣ Codex 任务索引表

| 阶段 | 任务名 | 功能摘要 |
|------|--------|-----------|
| 00 | project_assessment | 检测 Node 特性与 Next.js 依赖 |
| 01 | init_deno_env | 初始化 Deno 环境 |
| 02 | restructure_project | 重构目录结构 |
| 03 | generate_deno_entry | 创建 main.ts 入口 |
| 04 | convert_next_features | 替换 Next.js 特性 |
| 05 | migrate_api_routes | 重写 API 为 handler |
| 06 | integrate_tailwind | 集成 Tailwind |
| 07 | rewrite_auth_module | 重构认证逻辑 |
| 08 | rebuild_docs_engine | 改造文档渲染引擎 |
| 09 | migrate_i18n_and_config | 迁移多语言与配置文件 |
| 10 | replace_testing_framework | 替换 Vitest 测试 |
| 11 | build_pipeline | 构建 Docker 镜像 |
| 12 | deploy_systemd | 部署 systemd 服务 |
| 13 | cleanup_legacy | 清理 Node 遗留 |
| 14 | verify_deno_native | 验证纯 Deno 环境运行 |

---

## 5️⃣ 分阶段执行规划

### Phase 1 — 基础环境与配置迁移

| Codex | 任务 | 涉及文件 | 动作 |
|--------|------|-----------|------|
| 00 | project_assessment | package.json / Makefile / start.sh | 扫描 Node-only 调用 |
| 01 | init_deno_env | deno.json / import_map.json | 初始化 Deno 项目结构 |
| 02 | restructure_project | ui/homepage/* | 重构 routes/components/static 目录 |
| 03 | generate_deno_entry | main.ts | 新建 Deno 启动入口文件 |

#### ✅ 测试验证（Phase 1）
- **03_generate_deno_entry**：`cd ui/homepage && deno run --allow-read --allow-net --allow-env main.ts`
  - 服务器启动后应输出 Aleph 的启动日志，确认路由扫描与静态目录挂载成功，`Ctrl+C` 结束进程。

---

### Phase 2 — 构建与运行时适配

| Codex | 任务 | 文件 | 动作摘要 |
|--------|------|--------|----------|
| 04 | convert_next_features | 全局 TSX 文件 | 替换 `next/head/link/image` |
| 05 | migrate_api_routes | app/api/** | 改为 Deno handler 函数 |
| 06 | integrate_tailwind | tailwind.config.mjs | 改为 ESM 并注册 deno task |
| 07 | rewrite_auth_module | app/api/auth/** | 重构 Auth 模块为 Deno handler |
| 08 | rebuild_docs_engine | app/docs/** | 使用 Deno Markdown 渲染器 |
| 09 | migrate_i18n_and_config | lib/serviceConfig.ts / i18n | 替换 process.env 为 Deno.env.get |

---

### Phase 3 — 测试与部署迁移

| Codex | 任务 | 文件 | 动作摘要 |
|--------|------|--------|----------|
| 10 | replace_testing_framework | vitest.config.ts | 替换为 Deno test |
| 11 | build_pipeline | Dockerfile | 改为 Deno 构建镜像 |
| 12 | deploy_systemd | homepage.service | 定义 Deno 服务 |
| 13 | cleanup_legacy | .next / node_modules | 删除 Node 依赖 |
| 14 | verify_deno_native | 全局 | 验证 Deno 独立运行 |

---

## 6️⃣ 核心任务模板

### 🧩 codex/01_init_deno_env.sh
```bash
#!/usr/bin/env bash
set -e
cd ui/homepage

echo "🧹 Cleaning Node environment..."
rm -rf node_modules package*.json .next

echo "📦 Initializing Deno environment..."
deno init --unstable

cat > deno.json <<'EOF'
{
  "tasks": {
    "dev": "deno run -A --compat npm:next dev",
    "build": "deno run -A --compat npm:next build",
    "start": "deno run -A --compat npm:next start -p 3000",
    "test": "deno test -A"
  },
  "imports": {
    "@/": "./",
    "react": "npm:react@19",
    "react-dom": "npm:react-dom@19"
  }
}
EOF
🧩 codex/03_generate_deno_entry.sh
bash
复制代码
#!/usr/bin/env bash
cd ui/homepage

cat > main.ts <<'EOF'
import { serve } from "https://deno.land/x/aleph@1.0.0-beta.27/server/mod.ts";

serve({
  router: {
    glob: "./routes/**/*.{ts,tsx}"
  },
  staticDir: "./static",
  port: Deno.env.get("PORT") ?? 3000
});
EOF
🧩 codex/06_integrate_tailwind.sh
bash
复制代码
#!/usr/bin/env bash
cd ui/homepage

echo "⚙️ Initializing TailwindCSS for Deno..."
deno run -A npm:tailwindcss init -p

sed -i 's/module.exports/export default/' tailwind.config.js
mv tailwind.config.js tailwind.config.mjs
🧩 codex/11_build_pipeline.sh
bash
复制代码
#!/usr/bin/env bash
cd ui/homepage

cat > Dockerfile <<'EOF'
FROM denoland/deno:2.5.4
WORKDIR /app
COPY . .
RUN deno task build
EXPOSE 3000
CMD ["deno", "task", "start"]
EOF
🧩 codex/12_deploy_systemd.sh
bash
复制代码
#!/usr/bin/env bash
cat > /etc/systemd/system/homepage.service <<'EOF'
[Unit]
Description=Homepage Deno SSR Service
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/XControl/ui/homepage
ExecStart=/usr/bin/deno task start
Restart=always
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable homepage
sudo systemctl start homepage
7️⃣ 风险与缓解策略
风险	缓解方案
Next.js 对 Deno 支持有限	可转向 Aleph.js/Fresh 框架
Node-only npm 包	使用 deno add npm:xxx 测试导入
兼容层性能损耗	逐步用 Deno API 替代 npm 兼容层
CI/CD 差异	双轨管控 Node + Deno，后续合并
团队适应成本	增补文档 docs/deno-quickstart.md

8️⃣ 验收标准
检查项	验证方式
无 Node 环境依赖	grep -r "require(" . 返回空
所有任务 Deno 化	deno task list 正常输出
构建成功	deno task build
测试通过	deno test -A
服务启动成功	deno task start 或 systemd 服务正常运行
Docker 镜像无 Node	docker run --rm homepage-deno:latest 成功启动
