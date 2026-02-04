# Clash Rule Tester

一站式 **Clash 规则编辑 / 校验 / 测试** 工具，支持可选的 **AI 优化与解释**。

## ✨ 功能亮点

- **编辑器 + 校验统一**：CodeMirror linter 与页面“验证结果”复用同一套解析/校验逻辑（避免“双轨分叉”）
- **规则测试**：输入 domain / process / src/dst IP/port / network / uid 等，查看命中规则与解释
- **GeoIP 真实模式（离线库）**：IP -> 国家码 -> `GEOIP` 规则匹配（仅 Server 模式可用）
- **AI 助手**：一键优化规则 / 解释命中原因（OpenAI / Gemini / OpenAI-compatible，仅 Server 模式可用）
- **数据管理**：Policy / GeoSite / ASN 等数据源管理与启用开关

## 🚀 快速开始

要求：Node.js ≥ 18，pnpm

```bash
pnpm install
pnpm dev
```

默认访问：`http://localhost:3000`

自定义端口（可选）：

```bash
pnpm dev -- -p 4001
```

## 📦 构建与部署

本项目支持两种模式：

### 1) Server 模式（推荐）

支持 `app/api/*`（AI / GeoIP 都依赖它）：

```bash
pnpm build
pnpm start
```

### 2) Static Export 模式（纯静态）

导出到 `out/`（注意：静态导出不支持 Route Handlers，因此 **AI / GeoIP 功能不可用**）：

```bash
pnpm export
```

更多细节见 `deploy/README.md`。

## 🔐 安全提示

- AI Key 会保存在浏览器本地存储，并通过同源 `/api/ai/*` 由服务端转发到提供商；请勿在共享设备/公开环境中填写敏感 Key。

## 📚 文档

- 代码 vs 真实运作差距与方案：`docs/runtime-gaps.md`
- React/Next CVE 与审计记录：`docs/security-cve-react-nextjs.md`

## 🧾 GeoIP 数据署名

本项目使用 IPLocate 的免费 IP 数据库（CC BY-SA 4.0）：`https://www.iplocate.io/free-databases`

## 🤝 贡献

欢迎 PR / Issue（请尽量附复现步骤、截图与预期行为）。

## 📄 License

MIT
