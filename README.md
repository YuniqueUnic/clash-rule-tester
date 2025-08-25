# Clash Ruler

一个基于 Next.js、React、TypeScript 和 Tailwind CSS 构建的 Web
应用程序，旨在提供一个强大的 Clash 规则编辑、AI 优化、数据管理和策略管理平台。

## ✨ 功能

- **Clash 规则编辑**: 提供一个功能丰富的代码编辑器，支持 Clash
  规则的编写、格式化、语法高亮和 Linting。
- **AI 优化**: 集成 AI SDK，可能用于智能优化 Clash 规则或提供建议。
- **数据管理**: 支持 ASN、GeoIP、GeoSite、网络和策略数据的管理。
- **策略管理**: 方便地创建、编辑和管理 Clash 代理策略。
- **实时测试**: 提供规则测试功能，帮助用户验证规则的有效性。
- **响应式设计**: 界面适应不同设备，提供良好的用户体验。

## 🚀 技术栈

- **前端框架**: Next.js (React.js)
- **UI 组件**: Shadcn UI (基于 Radix UI 和 Tailwind CSS)
- **样式**: Tailwind CSS
- **状态管理**: React Context (推测，待确认)
- **代码编辑器**: CodeMirror
- **AI 集成**: `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible`
- **图表**: Recharts
- **表单**: React Hook Form, Zod
- **类型检查**: TypeScript
- **包管理**: pnpm

## 📦 安装

在本地克隆项目并安装依赖：

```bash
git clone https://github.com/YuniqueUnic/clash-rule-tester.git
cd clashruler
pnpm install
```

## ⚙️ 使用

### 开发模式

```bash
pnpm dev --port 4001
```

应用程序将在 `http://localhost:4001` 启动。

### 构建

```bash
pnpm build
```

这将在 `.next` 目录中生成生产构建版本。

### 静态导出

```bash
pnpm run export
```

这将在 `out` 目录中生成静态文件，可用于静态站点托管。

## ☁️ 部署

本项目配置为静态导出，非常适合部署到 Vercel 等静态站点托管平台。

### 部署到 Vercel

1. 确保您已安装 Vercel CLI (`npm i -g vercel`).
2. 在项目根目录运行 `vercel` 命令。
3. 按照提示进行操作，Vercel 将会自动检测 Next.js 项目并部署 `out`
   目录中的静态文件。

**注意**: 当前项目配置中可能包含 `basePath` 设置 (例如
`/tool/clashruler`)。如果您的应用部署在 Vercel 的根目录下，您可能需要调整
`next.config.mjs` 中的 `basePath` 和 `assetPrefix` 配置。

## 🤝 贡献

欢迎社区贡献！请遵循以下步骤：

1. Fork 本仓库。
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)。
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 打开一个 Pull Request。

## 📄 许可证

本项目采用 MIT 许可证。
