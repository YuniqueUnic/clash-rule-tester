# CLASH Rule Tester 静态部署指南
# 部署说明

本项目支持两种部署模式：

1. **Server 模式（推荐）**：标准 Next.js 部署，支持 `app/api/*`（本项目的 AI 代理接口依赖该能力）。
2. **Static Export 模式**：纯静态导出到 `out/`，适合 GitHub Pages / Cloudflare Pages；但不支持 Route Handlers，因此 **AI 服务端代理不可用**。

---

## 1) Server 模式（推荐：Vercel / Node）

适用场景：

- 需要使用 AI 功能（`/api/ai/*`）
- 希望在服务端统一做错误兜底、速率限制、审计等

构建与运行：

```bash
pnpm install
pnpm run build
pnpm start
```

### Vercel

- 直接导入 GitHub 仓库即可（Framework 选择 Next.js）
- 仓库根目录的 `vercel.json` 已按 Server 模式调整（不再输出到 `out/`）

---

## 2) Static Export 模式（纯静态：GitHub Pages / Cloudflare Pages）

适用场景：

- 只需要离线规则解析/校验/匹配能力
- 不需要服务端 API（例如 AI 代理）

构建：

```bash
pnpm install
pnpm run export
```

产物目录：`out/`

限制（Next 静态导出固有）：

- 不支持 Route Handlers / API 路由（因此本项目 AI 代理不可用）
- 不支持 SSR / 中间件

---

## 3) GeoIP 离线数据库（构建前自动下载）

- 构建前会自动执行 `pnpm geoip:download`，生成 `public/geoip/ip-to-country.mmdb`
- 注意该文件已加入 `.gitignore`，不会提交到仓库

许可与署名：

- GeoIP 数据来自 IPLocate free database（CC BY-SA 4.0，需要署名）
- UI 与文档中已加入署名链接：`https://www.iplocate.io/free-databases`
