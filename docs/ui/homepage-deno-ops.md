# `ui/homepage` Deno 运维手册

> 本文档补充《ui-homepage-deno-migration-plan.md》，面向负责首页构建、部署与日常运维的同学，介绍 Node.js -> Deno 迁移后的操作手册与注意事项。

## 1. 环境准备

1. 安装最新稳定版 [Deno](https://deno.land/manual/getting_started/installation)，确保 `deno` 命令可用。
2. **不再需要** Node.js / Yarn。若仍保留旧环境，不会影响 Deno 任务，但建议移除以避免混淆。
3. 首页相关的 npm 依赖通过 Deno 的 `npm:` 兼容层按需下载，缓存目录位于：
   - macOS / Linux: `~/Library/Caches/deno` 或 `~/.cache/deno`
   - CI / 容器环境：`/deno-dir`
4. 若需预生成图标，仍需安装 ImageMagick (`magick` 或 `convert` 命令)。

## 2. 目录与关键文件

| 路径 | 说明 |
| --- | --- |
| `deno.jsonc` | 定义首页相关的 Deno `tasks`、依赖锁 (`deno.lock`) 与标准库别名。|
| `ui/homepage/Makefile` | 面向人类的命令封装，内部全部调用 `deno task ...`。|
| `scripts/*.ts` | 构建期辅助脚本：slug 导出、Markdown 扫描、下载清单抓取、构建检测。均已改写为 Deno API。|
| `ui/homepage/next.config.mjs`、`tailwind.config.mjs` 等 | 全部采用 ESM 语法，可直接被 Deno Node 兼容层加载。|
| `ui/homepage/Dockerfile` | 基于 `denoland/deno` 镜像构建与运行。|

## 3. 常用任务对照

以下命令默认在仓库根目录执行，`make` 与 `deno task` 可互换使用。

| 操作 | `deno task` | `make` 等价命令 |
| --- | --- | --- |
| 启动开发服务器 | `deno task homepage:dev -- -p 3001` | `make -C ui/homepage dev PORT=3001` |
| 执行构建（含预处理） | `deno task homepage:build` | `make -C ui/homepage build` |
| 静态导出 | `deno task homepage:export` | `make -C ui/homepage export` |
| 运行预构建脚本 | `deno task homepage:prebuild` | `make -C ui/homepage prebuild` |
| 抓取下载镜像清单 | `deno task homepage:fetch-dl-index` | `make -C ui/homepage fetch-manifests` |
| 运行单元测试 | `deno task homepage:test` | `make -C ui/homepage test` |
| Lint | `deno task homepage:lint` | `make -C ui/homepage lint` |
| 构建检查 | `deno task homepage:check-build` | `make -C ui/homepage prebuild && deno task homepage:check-build` |

> 备注：若需要向 Next.js 传递额外 CLI 选项，可在命令末尾附加，如 `deno task homepage:dev -- --hostname 0.0.0.0`。

## 4. CI / 自动化接入指南

1. 在 CI 镜像中安装 Deno，可使用官方安装脚本：`curl -fsSL https://deno.land/install.sh | sh`，并设置 `DENO_INSTALL` 与 `PATH`。
2. 缓存：缓存 `deno.lock`、`deno_dir`（默认为 `~/.cache/deno`）可加速依赖下载。
3. 流水线示例：
   ```yaml
   - uses: denoland/setup-deno@v1
     with:
       deno-version: v1.x
   - run: deno task homepage:build
   - run: deno task homepage:check-build
   ```
4. 若需生成静态站点，可运行 `deno task homepage:export`，产物位于 `ui/homepage/out/`。
5. 容器镜像构建：执行 `docker build -f ui/homepage/Dockerfile .`，Dockerfile 内部已安装 Deno 并运行 `deno task homepage:build`。

## 5. 环境变量与配置

- 服务端代码通过 `lib/serviceConfig.ts` 的 `getEnv()` 包装读取环境变量，自动兼容 `Deno.env.get` 与 Next.js 的 `process.env` 注入机制。
- 客户端可用变量需以 `NEXT_PUBLIC_` 前缀命名，构建时由 Next.js 嵌入，无需手动配置。
- 在 Deno 运行时设定环境变量：
  - 本地：`NEXT_PUBLIC_API_BASE=https://... deno task homepage:dev`
  - Docker：编辑 `ui/homepage/Dockerfile` 或运行容器时使用 `-e` 传入。

## 6. 迁移后遗留与常见问题

1. **npm 依赖首次安装缓慢**：Deno 会将 npm 包解压到 `deno_dir`，首次执行可能较慢。建议在 CI 缓存该目录。
2. **Vitest 仍依赖 Node 兼容层**：命令通过 `npm:vitest` 启动，如需纯 Deno 测试需另行评估迁移成本。
3. **磁盘权限**：某些受限环境需要允许 Deno 的文件系统与网络访问。所有任务默认使用 `-A`（允许全部权限）。如需最小权限运行，可自行调整 `deno.jsonc` 中的任务定义。
4. **清理构建产物**：`make -C ui/homepage clean` 仅清理 Next.js 输出；若要重置依赖缓存，需手动删除 `deno.lock` 与 `~/.cache/deno`。

## 7. 回退指引

- 若需临时回退到 Node.js 流程，可检出迁移前的 Git 标签（参见 Git 历史中的 `refactor(homepage): migrate build and runtime tooling to Deno` 之前的版本）。
- 回退后需恢复 `ui/homepage/yarn.lock` 与 `package.json` 中的 Node 脚本，以及旧版 `Makefile`/`Dockerfile`。推荐仅在紧急情况下使用，并在修复问题后尽快回到 Deno 版本。

---

如遇到本文未覆盖的问题，请在 `docs/ui-homepage-deno-migration-plan.md` 中追加更新，并在该文档补充操作经验。
