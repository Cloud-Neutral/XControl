# Next.js Admin Panel

本文档概述如何使用 Next.js App Router 和 Tailwind CSS 搭建 XControl 后台管理界面，并满足静态导出的要求。

## 目录结构建议

```text
app/
├── layout.tsx               # 全局布局：含侧边栏
├── page.tsx                 # 首页
├── agent/
│   └── page.tsx             # Agent 管理页
├── api/
│   └── page.tsx             # API 服务状态页
├── subscription/
│   └── page.tsx             # 订阅管理页
components/
├── Sidebar.tsx              # 侧边栏
├── Header.tsx               # 顶部标题栏（可选）
├── Card.tsx                 # 通用卡片组件
lib/
├── api.ts                   # 后端 API 请求封装
styles/
├── globals.css              # 全局样式
```

## 快速启动
1. 初始化项目：
   ```bash
   npx create-next-app@latest xcontrol --ts --app --tailwind
   ```
2. 按上文目录创建页面与组件，使用 Tailwind 构建基础 UI。
3. 将 Go 服务接口代理到 `/api/*` 路径，方便前后端联调。

## 静态导出配置
- 所有页面禁止使用 `getServerSideProps`，保持静态内容。
- 每个页面或布局文件显式声明：
  ```ts
  export const dynamic = 'force-static'
  ```
- 使用 `next export` 生成静态 HTML：
  ```bash
 npm run build && npx next export
  ```

生成的 `out/` 目录即可作为纯静态网站部署。

## 响应式设计
示例实现利用 Tailwind 的 `md:` 等断点完成移动端适配：

- 小屏幕默认隐藏侧边栏，在 Header 内提供菜单按钮控制显示。
- 大屏幕侧边栏常驻，内容区域使用 `md:ml-64` 留出宽度。

布局组件 `layout.tsx` 中使用 React 状态切换侧边栏，可满足主流移动端浏览体验。

## 示例代码结构
本仓库 `ui/nextjs` 目录提供了一套最简参考实现，可直接 `npm run build && npx next export` 编译到 `ui/dist` 供 Go 服务嵌入。
