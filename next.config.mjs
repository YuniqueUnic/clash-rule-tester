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
  // 开发环境跨域配置
  ...(process.env.NODE_ENV === "development" && {
    allowedDevOrigins: ["127.0.0.1", "localhost"],
  }),
};

export default nextConfig;
