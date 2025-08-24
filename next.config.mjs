/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用构建时的 ESLint 检查
  eslint: {
    ignoreDuringBuilds: false,
    // 在构建时检查所有目录
    dirs: ["app", "components", "lib", "hooks", "contexts"],
  },
  // 启用构建时的 TypeScript 类型检查
  typescript: {
    ignoreBuildErrors: false,
    // 在构建时进行严格的类型检查
    tsconfigPath: "./tsconfig.json",
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
