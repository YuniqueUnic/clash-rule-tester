# CLASH Rule Tester 静态部署指南

本项目已配置为支持静态导出，可以部署到以下平台：

## 部署平台

### 1. Cloudflare Pages

#### 自动部署
1. 将代码推送到 GitHub 仓库
2. 登录 Cloudflare Dashboard
3. 进入 Pages 部分，点击"创建项目"
4. 连接你的 GitHub 仓库
5. 使用以下配置：
   - **构建命令**: `pnpm run export`
   - **构建输出目录**: `out`
   - **Node.js 版本**: `18` 或更高

#### 手动部署
使用提供的 `deploy/cloudflare-pages.toml` 配置文件。

### 2. GitHub Pages

#### 使用 GitHub Actions
1. 确保代码在 GitHub 仓库中
2. 仓库设置中启用 GitHub Pages
3. 使用提供的 `deploy/github-pages.yml` 工作流
4. 推送代码到 `main` 分支将自动触发部署

#### 本地部署
```bash
pnpm run export
# 将 out 目录内容推送到 gh-pages 分支
```

### 3. Vercel

#### 自动部署
1. 将代码推送到 GitHub 仓库
2. 登录 Vercel Dashboard
3. 导入项目
4. 使用提供的 `deploy/vercel.json` 配置

#### 手动部署
```bash
pnpm run export
# 使用 Vercel CLI 部署 out 目录
vercel --prod
```

## 本地构建和测试

```bash
# 安装依赖
pnpm install

# 构建静态文件
pnpm run export

# 本地预览（需要静态服务器）
pnpm add -g serve
serve out -p 3000
```

## 环境变量

各平台部署时需要设置以下环境变量：

```env
NEXT_PUBLIC_STATIC_DEPLOYMENT=true
NEXT_PUBLIC_DEPLOYMENT_PLATFORM=[cloudflare|github|vercel]
```

## 注意事项

1. **静态导出限制**：
   - 不支持 API 路由
   - 不支持服务器端渲染 (SSR)
   - 不支持中间件
   - 动态路由需要预生成

2. **CodeMirror 配置**：
   - 已配置为静态 bundle
   - 所有主题和语言包已预先加载

3. **路由处理**：
   - 所有路由都重定向到 index.html
   - 使用 HTML5 History API 处理导航

## 故障排除

### 构建失败
- 检查 Node.js 版本是否 >= 18
- 确保所有依赖已正确安装
- 检查 TypeScript 类型错误

### 部署后功能异常
- 确认环境变量已正确设置
- 检查浏览器控制台是否有错误信息
- 验证静态资源是否正确加载

### 路由问题
- 确认服务器配置支持 SPA 路由
- 检查重写规则是否正确配置
- 验证 trailing slash 设置

## 性能优化

项目已包含以下优化：
- 静态资源压缩
- 代码分割
- 预加载关键资源
- 缓存策略配置

## 安全配置

所有平台配置都包含基本的安全头：
- XSS 保护
- 点击劫持防护
- MIME 类型嗅探防护
- 引用策略
- 权限策略