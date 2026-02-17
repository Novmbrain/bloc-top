# BlocTop (寻岩记)

攀岩线路分享平台 — 查找岩场、浏览线路、分享 Beta 视频。

## Monorepo 结构

| 包 | 说明 |
|---|------|
| `apps/pwa` | 面向用户的 PWA 应用 |
| `apps/editor` | Topo 编辑器 (独立部署) |
| `packages/shared` | 共享逻辑 (types, db, permissions) |
| `packages/ui` | 共享 UI 组件 |

## 技术栈

Next.js 16 + App Router, MongoDB Atlas, Tailwind CSS v4 + shadcn/ui, next-intl (zh/en/fr), Serwist PWA, better-auth (Magic Link + Passkey), Turborepo + pnpm

## 开发

```bash
nvm use
pnpm install
cp apps/pwa/.env.example apps/pwa/.env.local  # 配置环境变量
pnpm dev                                       # 启动全部应用
```

详细开发指南见 [CLAUDE.md](./CLAUDE.md) 和 [doc/PROJECT_OVERVIEW.md](./doc/PROJECT_OVERVIEW.md)。
