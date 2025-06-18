/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 开启静态导出
  reactStrictMode: true,
  // 移除 experimental.appDir
  // experimental: {
  //   appDir: true
  // }
}

module.exports = nextConfig
