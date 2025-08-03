/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 静态导出
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3002/api/:path*', // 后端服务
      },
    ]
  },
}

module.exports = nextConfig
