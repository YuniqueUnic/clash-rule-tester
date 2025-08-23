/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 静态导出配置
  output: "export",
  trailingSlash: true,
  distDir: "out",
  // 跳过静态生成过程中的优化步骤
  experimental: {
    optimizeCss: false,
  },
};

export default nextConfig;
