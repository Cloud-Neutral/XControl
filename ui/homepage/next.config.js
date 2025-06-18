/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // ✅ 开启静态导出支持
  reactStrictMode: true,
  experimental: {
    appDir: true // ✅ 启用 App Router 模式
  }
}

module.exports = nextConfig

