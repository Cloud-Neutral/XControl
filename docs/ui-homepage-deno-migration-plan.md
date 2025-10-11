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

#### ✅ 测试验证（Phase 2）
- **04_convert_next_features**：
  - `rg "next/(head|link|image|script)" ui/homepage --glob "*.tsx"` 应无匹配结果，确认已移除 Next.js UI 组件依赖。
  - 随机抽查组件文件，确保导航链接改用 `aleph/react` 提供的 `<Link>`，图像使用原生 `<img>` 标签。

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

## 9️⃣ 迁移完成收益与量化指标

### 🌐 运行时统一与跨平台兼容

| 维度 | 迁移前（Node.js） | 迁移后（Deno） |
|------|-------------------|-----------------|
| 环境依赖 | Node.js + Yarn + npm + npx | ✅ 单一可执行文件 `deno` |
| 模块格式 | CommonJS / ESM 混用 | ✅ 纯 ESM 原生支持 |
| 路径解析 | `tsconfig.json` + Webpack alias | ✅ `import_map.json` 统一解析 |
| CLI 任务 | npm scripts / Makefile | ✅ `deno task` 原生跨平台运行 |

> **效果**：开发机、CI、容器、边缘节点统一使用 `deno task dev/start`，无需再锁定 Node 版本或调整包管理兼容性。

### ⚡ 性能与启动速度提升

| 指标 | Node.js (Next) | Deno Runtime |
|------|----------------|--------------|
| 冷启动时间 | 1.5–2.0 s | < 500 ms |
| 构建缓存 | Webpack / SWC | Deno 内置缓存 (`deno cache`) |
| 打包大小 | `.next` ≈ 120 MB | `.aleph` / 静态导出 ≈ 30 MB |
| 运行内存 | 300–400 MB | 180–250 MB |

> **效果**：SSR 启动更快，容器镜像体积缩减至 < 300 MB，可直接运行在 Deno Deploy / Cloudflare Workers 等边缘节点。

### 🔒 安全模型升级

| 能力 | Node.js | Deno |
|------|---------|------|
| 默认权限 | 完全开放文件系统与网络访问 | ✅ 默认沙盒隔离（需显式授权） |
| 包来源 | `npm registry`（供应链风险） | ✅ URL import + integrity hash 验证 |
| 内置审核 | 无 | ✅ `deno lint` / `deno check` 全量类型检查 |
| Secret 管理 | `process.env` 依赖系统环境 | ✅ `Deno.env.get` + 权限分级控制 |

> **效果**：在开发与生产阶段精准控制文件、网络与环境变量访问，从源头降低供应链攻击与配置泄漏风险。

### 🧩 构建与部署流程简化

| 流程环节 | Node.js (原流程) | Deno (迁移后) |
|----------|------------------|----------------|
| 依赖安装 | `yarn install` | ✅ 无需安装，URL 即取即用 |
| 构建 | `next build` + Webpack | ✅ `deno task build`（原生 ESM） |
| 镜像 | `node:20` + nginx | ✅ 单层 `denoland/deno` 镜像 |
| 启动 | `node server.js` / `npm run start` | ✅ `deno task start` |

> **效果**：构建链复杂度降低 70% 以上，部署镜像缩小 2–3 倍，CI/CD 摆脱 npm cache 与 Node 版本锁定。

### 🧠 开发体验与可维护性增强

| 优势 | 说明 |
|------|------|
| 💡 TypeScript 原生支持 | 直接运行 `.ts/.tsx`，无需额外 `tsc` 编译 |
| 🔁 即时任务执行 | `deno task` 取代 Makefile / npm scripts |
| 🧪 内置测试框架 | 内建断言库，无需 Vitest |
| 🧹 代码一致性 | 统一 ESM 风格与 `import_map` 规范 |
| 📘 文档同步 | 可直接托管在 Deno Deploy / Cloudflare Pages |

> **效果**：团队开发体验贴近 Go / Rust 的简洁模式，前端代码实现“即写即跑”的无构建体验。

### ☁️ Bonus：未来扩展方向

- 🔀 深度整合 Aleph.js / Fresh，获取原生 SSR 与边缘渲染能力；
- ⚙️ 使用 `deno compile` 生成无依赖的单体可执行文件；
- 🧩 统一前后端构建管线，使 AI Agent / AskAI 模块在 Deno Runtime 直接运行；
- 🌍 自动发布到 Deno Deploy 或 Cloudflare Workers，实现全球边缘渲染。

### ✅ 量化成果指标（预期）

| 指标项 | 改造前 | 改造后 | 提升 |
|--------|--------|--------|------|
| 构建耗时 | ≈ 180 s | ≈ 60 s | ⬆ 3× |
| 冷启动延迟 | 1.5 s | 0.4 s | ⬆ 3.7× |
| 运行内存 | 400 MB | 220 MB | ⬇ 45% |
| 镜像体积 | 1.2 GB | < 400 MB | ⬇ 65% |
| CI/CD 步骤 | 6 步 | 2 步 | ⬇ 66% |

