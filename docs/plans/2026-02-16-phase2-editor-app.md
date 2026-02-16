# Phase 2: Editor App 创建 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 editor 功能从 PWA 拆为独立 Next.js App (`apps/editor`)，共享代码提取到 `packages/shared` 和 `packages/ui`。

**Architecture:** 采用"提取共享包 → 创建 Editor 骨架 → 迁移 editor 代码 → 连接 webhook"四阶段渐进式迁移。使用 re-export 桥接避免一次性破坏 PWA 的 import。

**Tech Stack:** Next.js 16 + React 19 + Turborepo + pnpm workspaces + better-auth + MongoDB + Cloudflare R2

---

## 阶段概览

| 子阶段 | 任务数 | 目标 |
|--------|--------|------|
| 2a: 提取 `packages/shared` | Task 1-4 | 类型、DB、权限、工具函数 → 共享包 |
| 2b: 提取 `packages/ui` | Task 5-6 | UI 组件、globals.css、face-image-cache → UI 包 |
| 2c: 创建 Editor App | Task 7-9 | Next.js 骨架、auth、proxy |
| 2d: 迁移 Editor 代码 | Task 10-13 | 页面、组件、API 路由、webhook |
| 2e: PWA 切换 import | Task 14-15 | PWA 改用 packages、清理 re-export 桥 |
| 2f: 验证 | Task 16 | 全量构建 + 测试 + commit |

---

## 前置约定

### Re-export 桥接策略

提取模块到 packages/ 后，在 apps/pwa 原位置创建 re-export 文件，避免一次性修改所有 consumer：

```typescript
// apps/pwa/src/types/index.ts（提取后变为 re-export 桥）
export * from '@bloctop/shared/types'
```

这样 PWA 内部 `import { Crag } from '@/types'` 不需要立即改动。Task 14 再批量替换。

### Workspace 依赖声明

apps/pwa 和 apps/editor 的 `package.json` 需要声明对 shared packages 的依赖：

```json
{
  "dependencies": {
    "@bloctop/shared": "workspace:*",
    "@bloctop/ui": "workspace:*"
  }
}
```

### 包导出约定

packages 使用 TypeScript source 直接导入（monorepo 内部无需编译）：

```json
// packages/shared/package.json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./db": "./src/db/index.ts",
    "./permissions": "./src/permissions.ts",
    "./*": "./src/*.ts"
  }
}
```

---

## 阶段 2a: 提取 `packages/shared`

### Task 1: 提取类型定义到 packages/shared

**Files:**
- Move: `apps/pwa/src/types/index.ts` → `packages/shared/src/types/index.ts`
- Create: `apps/pwa/src/types/index.ts` (re-export 桥)
- Modify: `packages/shared/package.json` (添加 exports)

**Step 1: 更新 packages/shared/package.json**

```json
{
  "name": "@bloctop/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./*": "./src/*.ts"
  },
  "dependencies": {
    "mongodb": "^7.0.0"
  },
  "peerDependencies": {
    "react": "^19",
    "next": "^16"
  }
}
```

**Step 2: 移动类型文件**

```bash
mkdir -p packages/shared/src/types
git mv apps/pwa/src/types/index.ts packages/shared/src/types/index.ts
```

**Step 3: 创建 re-export 桥**

```typescript
// apps/pwa/src/types/index.ts
export * from '@bloctop/shared/types'
```

**Step 4: 更新 packages/shared/src/index.ts**

```typescript
export * from './types'
```

**Step 5: 声明 workspace 依赖**

在 `apps/pwa/package.json` 中添加：
```json
"dependencies": {
  "@bloctop/shared": "workspace:*",
  ...
}
```

运行 `pnpm install` 更新 lockfile。

**Step 6: 验证构建**

```bash
pnpm run build
pnpm run test:run
```
Expected: 全部通过（re-export 桥保证 import 路径不变）

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor: extract types to packages/shared"
```

---

### Task 2: 提取 MongoDB 连接 + DB 层

**Files:**
- Move: `apps/pwa/src/lib/mongodb.ts` → `packages/shared/src/mongodb.ts`
- Move: `apps/pwa/src/lib/db/index.ts` → `packages/shared/src/db/index.ts`
- Move: `apps/pwa/src/lib/db/index.test.ts` → `packages/shared/src/db/index.test.ts`
- Create: re-export 桥 in `apps/pwa/src/lib/mongodb.ts` 和 `apps/pwa/src/lib/db/index.ts`
- Modify: `packages/shared/package.json` (添加 db export)

**Step 1: 移动文件**

```bash
git mv apps/pwa/src/lib/mongodb.ts packages/shared/src/mongodb.ts
mkdir -p packages/shared/src/db
git mv apps/pwa/src/lib/db/index.ts packages/shared/src/db/index.ts
git mv apps/pwa/src/lib/db/index.test.ts packages/shared/src/db/index.test.ts
```

**Step 2: 修复 packages/shared 内部 import 路径**

`packages/shared/src/db/index.ts` 中的 import 需要从 `@/lib/mongodb` 改为相对路径：
```typescript
// 旧: import { getDatabase } from '@/lib/mongodb'
// 新: import { getDatabase } from '../mongodb'
```

同样修复对 `@/types` 的 import：
```typescript
// 旧: import type { Crag, Route, ... } from '@/types'
// 新: import type { Crag, Route, ... } from '../types'
```

**Step 3: 创建 re-export 桥**

```typescript
// apps/pwa/src/lib/mongodb.ts
export { getDatabase } from '@bloctop/shared/mongodb'
```

```typescript
// apps/pwa/src/lib/db/index.ts
export * from '@bloctop/shared/db'
```

**Step 4: 更新 packages/shared/package.json exports**

```json
"exports": {
  ".": "./src/index.ts",
  "./types": "./src/types/index.ts",
  "./db": "./src/db/index.ts",
  "./mongodb": "./src/mongodb.ts",
  "./*": "./src/*.ts"
}
```

**Step 5: 更新 packages/shared/src/index.ts**

```typescript
export * from './types'
export * from './db'
export { getDatabase } from './mongodb'
```

**Step 6: 配置 packages/shared tsconfig 路径别名**

由于 db/index.ts 原来使用 `@/` 别名，移入 packages 后改用相对路径。确保 `packages/shared/tsconfig.json` 正确：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {}
  },
  "include": ["src/**/*"]
}
```

**Step 7: 验证**

```bash
pnpm run build && pnpm run test:run
```

**Step 8: Commit**

```bash
git commit -m "refactor: extract mongodb + db layer to packages/shared"
```

---

### Task 3: 提取权限 + 认证 helper

**Files:**
- Move: `apps/pwa/src/lib/permissions.ts` → `packages/shared/src/permissions.ts`
- Move: `apps/pwa/src/lib/require-auth.ts` → `packages/shared/src/require-auth.ts`
- Move: `apps/pwa/src/lib/require-auth.test.ts` → `packages/shared/src/require-auth.test.ts`
- Move: `apps/pwa/src/lib/logger.ts` → `packages/shared/src/logger.ts`
- Move: `apps/pwa/src/lib/api-error-codes.ts` → `packages/shared/src/api-error-codes.ts`
- Move: `apps/pwa/src/lib/rate-limit.ts` → `packages/shared/src/rate-limit.ts`
- Move: `apps/pwa/src/lib/request-utils.ts` → `packages/shared/src/request-utils.ts`
- Create: re-export 桥 for each file

**Step 1: 移动所有文件**

```bash
git mv apps/pwa/src/lib/permissions.ts packages/shared/src/permissions.ts
git mv apps/pwa/src/lib/require-auth.ts packages/shared/src/require-auth.ts
git mv apps/pwa/src/lib/require-auth.test.ts packages/shared/src/require-auth.test.ts
git mv apps/pwa/src/lib/logger.ts packages/shared/src/logger.ts
git mv apps/pwa/src/lib/api-error-codes.ts packages/shared/src/api-error-codes.ts
git mv apps/pwa/src/lib/rate-limit.ts packages/shared/src/rate-limit.ts
git mv apps/pwa/src/lib/request-utils.ts packages/shared/src/request-utils.ts
```

**Step 2: 修复 packages/shared 内部 import**

所有 `@/types` → `../types` 或 `./types`，`@/lib/db` → `./db`，etc.

**Step 3: 创建 re-export 桥**

对每个移动的文件创建 re-export：
```typescript
// apps/pwa/src/lib/permissions.ts
export * from '@bloctop/shared/permissions'
```

（对 require-auth、logger、api-error-codes、rate-limit、request-utils 同理）

**Step 4: 验证**

```bash
pnpm run build && pnpm run test:run
```

**Step 5: Commit**

```bash
git commit -m "refactor: extract permissions, auth helpers, and infra to packages/shared"
```

---

### Task 4: 提取工具函数

**Files:**
- Move: `apps/pwa/src/lib/constants.ts` → `packages/shared/src/constants.ts`
- Move: `apps/pwa/src/lib/tokens.ts` → `packages/shared/src/tokens.ts`
- Move: `apps/pwa/src/lib/utils.ts` → `packages/shared/src/utils.ts`
- Move: `apps/pwa/src/lib/grade-utils.ts` → `packages/shared/src/grade-utils.ts`
- Move: `apps/pwa/src/lib/city-utils.ts` → `packages/shared/src/city-utils.ts`
- Move: `apps/pwa/src/lib/topo-utils.ts` → `packages/shared/src/topo-utils.ts`
- Move: `apps/pwa/src/lib/topo-constants.ts` → `packages/shared/src/topo-constants.ts`
- Move: `apps/pwa/src/lib/beta-constants.ts` → `packages/shared/src/beta-constants.ts`
- Move: `apps/pwa/src/lib/filter-constants.ts` → `packages/shared/src/filter-constants.ts`
- Move: `apps/pwa/src/lib/route-utils.ts` → `packages/shared/src/route-utils.ts`
- Move: `apps/pwa/src/lib/crag-theme.ts` → `packages/shared/src/crag-theme.ts`
- Move: `apps/pwa/src/lib/editor-utils.ts` → `packages/shared/src/editor-utils.ts`
- Move: `apps/pwa/src/lib/editor-areas.ts` → `packages/shared/src/editor-areas.ts`
- Move: `apps/pwa/src/lib/revalidate-helpers.ts` → `packages/shared/src/revalidate-helpers.ts`
- Move: 对应的 `.test.ts` 文件
- Create: re-export 桥 for each

**Step 1: 批量移动**

```bash
for f in constants tokens utils grade-utils city-utils topo-utils topo-constants \
         beta-constants filter-constants route-utils crag-theme \
         editor-utils editor-areas revalidate-helpers; do
  git mv "apps/pwa/src/lib/${f}.ts" "packages/shared/src/${f}.ts"
  # 移动对应测试文件（如果存在）
  [ -f "apps/pwa/src/lib/${f}.test.ts" ] && \
    git mv "apps/pwa/src/lib/${f}.test.ts" "packages/shared/src/${f}.test.ts"
done
```

**Step 2: 修复内部 import（`@/types` → 相对路径）**

**Step 3: 创建 re-export 桥**

```bash
for f in constants tokens utils grade-utils city-utils topo-utils topo-constants \
         beta-constants filter-constants route-utils crag-theme \
         editor-utils editor-areas revalidate-helpers; do
  echo "export * from '@bloctop/shared/${f}'" > "apps/pwa/src/lib/${f}.ts"
done
```

**Step 4: 验证**

```bash
pnpm run build && pnpm run test:run
```

**Step 5: Commit**

```bash
git commit -m "refactor: extract utility modules to packages/shared"
```

---

## 阶段 2b: 提取 `packages/ui`

### Task 5: 提取 globals.css + 基础 UI 组件

**Files:**
- Move: `apps/pwa/src/app/globals.css` → `packages/ui/src/styles/globals.css`
- Move: `apps/pwa/src/components/ui/*.tsx` (16 files) → `packages/ui/src/components/`
- Create: re-export 桥

**Step 1: 更新 packages/ui/package.json**

```json
{
  "name": "@bloctop/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./styles/globals.css": "./src/styles/globals.css",
    "./components/*": "./src/components/*.tsx",
    "./*": "./src/*.ts"
  },
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19",
    "next": "^16",
    "@bloctop/shared": "workspace:*"
  },
  "dependencies": {
    "@bloctop/shared": "workspace:*"
  }
}
```

**Step 2: 移动 globals.css**

```bash
mkdir -p packages/ui/src/styles
git mv apps/pwa/src/app/globals.css packages/ui/src/styles/globals.css
```

在 `apps/pwa/src/app/globals.css` 创建 re-import：
```css
@import '@bloctop/ui/styles/globals.css';
```

> **注意**: CSS import 路径是否在 Next.js 中支持 workspace 包需要验证。如果不支持，可能需要在 `apps/pwa/src/app/layout.tsx` 中改 import 路径，或使用 `postcss` 插件。**如果遇到问题，保留 globals.css 在 apps/pwa 并复制一份到 packages/ui。**

**Step 3: 移动 UI 组件**

```bash
mkdir -p packages/ui/src/components
# 移动所有 shadcn/ui 基础组件
for f in button input textarea composition-input drawer skeleton toast \
         image-viewer segmented-control badge; do
  [ -f "apps/pwa/src/components/ui/${f}.tsx" ] && \
    git mv "apps/pwa/src/components/ui/${f}.tsx" "packages/ui/src/components/${f}.tsx"
done
```

**Step 4: 修复 packages/ui 内部 import**

UI 组件可能 import `@/lib/utils` (cn 函数)。改为：
```typescript
// 旧: import { cn } from '@/lib/utils'
// 新: import { cn } from '@bloctop/shared/utils'
```

**Step 5: 创建 re-export 桥**

```typescript
// apps/pwa/src/components/ui/button.tsx
export { Button, buttonVariants } from '@bloctop/ui/components/button'
```

（对每个 UI 组件同理）

**Step 6: 验证**

```bash
pnpm run build && pnpm run test:run
```

**Step 7: Commit**

```bash
git commit -m "refactor: extract UI components and globals.css to packages/ui"
```

---

### Task 6: 提取 face-image-cache + theme

**Files:**
- Move: `apps/pwa/src/lib/face-image-cache/` → `packages/ui/src/face-image/`
- Move: `apps/pwa/src/hooks/use-face-image.ts` → `packages/ui/src/face-image/use-face-image.ts`
- Move: `apps/pwa/src/components/face-image-provider.tsx` → `packages/ui/src/face-image/face-image-provider.tsx`
- Move: `apps/pwa/src/components/face-thumbnail-strip.tsx` → `packages/ui/src/face-image/face-thumbnail-strip.tsx`
- Move: `apps/pwa/src/components/theme-provider.tsx` → `packages/ui/src/theme/theme-provider.tsx`
- Move: `apps/pwa/src/components/theme-switcher.tsx` → `packages/ui/src/theme/theme-switcher.tsx`
- Create: re-export 桥

**Step 1: 移动 face-image-cache 模块**

```bash
mkdir -p packages/ui/src/face-image
git mv apps/pwa/src/lib/face-image-cache/types.ts packages/ui/src/face-image/types.ts
git mv apps/pwa/src/lib/face-image-cache/cache-service.ts packages/ui/src/face-image/cache-service.ts
git mv apps/pwa/src/lib/face-image-cache/cache-service.test.ts packages/ui/src/face-image/cache-service.test.ts
git mv apps/pwa/src/lib/face-image-cache/index.ts packages/ui/src/face-image/index.ts
git mv apps/pwa/src/hooks/use-face-image.ts packages/ui/src/face-image/use-face-image.ts
git mv apps/pwa/src/components/face-image-provider.tsx packages/ui/src/face-image/face-image-provider.tsx
git mv apps/pwa/src/components/face-thumbnail-strip.tsx packages/ui/src/face-image/face-thumbnail-strip.tsx
```

**Step 2: 移动 theme 模块**

```bash
mkdir -p packages/ui/src/theme
git mv apps/pwa/src/components/theme-provider.tsx packages/ui/src/theme/theme-provider.tsx
git mv apps/pwa/src/components/theme-switcher.tsx packages/ui/src/theme/theme-switcher.tsx
```

**Step 3: 修复内部 import + 创建 re-export 桥**

**Step 4: 验证 + Commit**

```bash
pnpm run build && pnpm run test:run
git commit -m "refactor: extract face-image-cache and theme to packages/ui"
```

---

## 阶段 2c: 创建 Editor App

### Task 7: Editor Next.js 骨架

**Files:**
- Create: `apps/editor/package.json`
- Create: `apps/editor/next.config.ts`
- Create: `apps/editor/tsconfig.json`
- Create: `apps/editor/postcss.config.mjs`
- Create: `apps/editor/src/app/layout.tsx`（根布局）
- Create: `apps/editor/src/app/globals.css`（import 共享样式）
- Create: `apps/editor/src/app/page.tsx`（临时首页）

**Step 1: 创建 package.json**

```json
{
  "name": "@bloctop/editor",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bloctop/shared": "workspace:*",
    "@bloctop/ui": "workspace:*",
    "next": "^16.1.2",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "better-auth": "^1.4.18",
    "@better-auth/passkey": "^1.4.18",
    "mongodb": "^7.0.0",
    "@aws-sdk/client-s3": "^3.975.0",
    "resend": "^6.9.2",
    "next-themes": "^0.4.6",
    "swr": "^2.4.0",
    "react-easy-crop": "^5.5.6",
    "react-zoom-pan-pinch": "^3.7.0",
    "lucide-react": "^0.483.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.3",
    "@types/react-dom": "^19.2.3",
    "typescript": "^5.8.3",
    "@tailwindcss/postcss": "^4.1.8",
    "tailwindcss": "^4.1.8"
  }
}
```

**Step 2: 创建 next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.bouldering.top' },
    ],
  },
  // Editor 不需要 Serwist (无 PWA 功能)
  // Editor 不需要 next-intl (纯中文)
  transpilePackages: ['@bloctop/shared', '@bloctop/ui'],
}

export default nextConfig
```

> **关键**: `transpilePackages` 确保 Next.js 编译 workspace 包内的 TypeScript 源码。

**Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: 创建 postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

**Step 5: 创建 globals.css**

```css
@import "tailwindcss";
@import "@bloctop/ui/styles/globals.css";

/* Editor 特有样式（如有） */
```

> 如果 CSS import workspace 包不工作，则复制 globals.css 内容到此文件。

**Step 6: 创建根布局 + 临时首页**

```typescript
// apps/editor/src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '寻岩记 · 编辑器',
  description: '岩场管理与数据标记服务',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
```

```typescript
// apps/editor/src/app/page.tsx
export default function EditorHome() {
  return <div>Editor App - Phase 2 Setup Complete</div>
}
```

**Step 7: 安装依赖 + 验证构建**

```bash
pnpm install
pnpm run build --filter=@bloctop/editor
```

Expected: Editor 独立构建成功

**Step 8: 验证 PWA 未被破坏**

```bash
pnpm run build --filter=@bloctop/pwa
pnpm run test:run
```

**Step 9: Commit**

```bash
git commit -m "feat: create apps/editor Next.js skeleton"
```

---

### Task 8: Editor better-auth 配置

**Files:**
- Create: `apps/editor/src/lib/auth.ts`（Editor 的 better-auth server 实例）
- Create: `apps/editor/src/lib/auth-client.ts`（Editor 的 better-auth client）

**Step 1: 创建 server auth**

```typescript
// apps/editor/src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'
import { passkey } from '@better-auth/passkey'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { MongoClient } from 'mongodb'

let _auth: ReturnType<typeof betterAuth> | null = null

export function getAuth() {
  if (_auth) return _auth

  const client = new MongoClient(process.env.MONGODB_URI!)
  const db = client.db(process.env.MONGODB_DB_NAME || 'bloctop')

  _auth = betterAuth({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    basePath: '/api/auth',
    database: mongodbAdapter(db),
    plugins: [
      admin({ defaultRole: 'user' }),
      passkey({
        rpID: 'bouldering.top',
        rpName: '寻岩记 BlocTop',
        origin: [
          process.env.NEXT_PUBLIC_APP_URL!,
          // 允许 www 子域名
          ...(process.env.NEXT_PUBLIC_APP_URL?.includes('bouldering.top')
            ? ['https://www.bouldering.top', 'https://editor.bouldering.top']
            : []),
        ],
      }),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 30,  // 30 days
      updateAge: 60 * 60 * 24,        // 1 day
      cookieCache: { enabled: true, maxAge: 300 },
    },
    user: {
      additionalFields: {
        name: { type: 'string', required: false },
      },
    },
  })

  return _auth
}
```

> **注意**: Editor 的 `BETTER_AUTH_SECRET` 环境变量 **必须与 PWA 不同**，确保 session 隔离。

**Step 2: 创建 client auth**

```typescript
// apps/editor/src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'

export const authClient = createAuthClient({
  plugins: [adminClient(), passkeyClient()],
})

export const { signIn, signOut, useSession, getSession } = authClient
```

**Step 3: 创建 auth API route**

```typescript
// apps/editor/src/app/api/auth/[...all]/route.ts
import { getAuth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

const auth = getAuth()

export const { GET, POST } = toNextJsHandler(auth.handler)
```

**Step 4: 验证构建**

```bash
pnpm run build --filter=@bloctop/editor
```

**Step 5: Commit**

```bash
git commit -m "feat: configure editor better-auth with independent instance"
```

---

### Task 9: Editor proxy.ts (auth guard)

**Files:**
- Create: `apps/editor/src/proxy.ts`

**Step 1: 创建 proxy**

```typescript
// apps/editor/src/proxy.ts
import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  // 允许 API 路由和静态资源通过
  const { pathname } = request.nextUrl

  // Auth API 路由不需要 guard
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // 检查 session cookie（better-auth 默认 cookie 名）
  const sessionToken = request.cookies.get('better-auth.session_token')
  if (!sessionToken) {
    // 未登录 → 重定向到 PWA 登录页
    const loginUrl = new URL(
      `${process.env.NEXT_PUBLIC_PWA_URL || 'https://bouldering.top'}/zh/login`
    )
    loginUrl.searchParams.set('callbackURL', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|favicon\\.ico|.*\\..*).*)')],
}
```

**Step 2: 验证构建**

```bash
pnpm run build --filter=@bloctop/editor
```

**Step 3: Commit**

```bash
git commit -m "feat: add editor proxy.ts auth guard"
```

---

## 阶段 2d: 迁移 Editor 代码

### Task 10: 迁移 Editor 页面

**Files:**
- Move: `apps/pwa/src/app/[locale]/editor/layout.tsx` → `apps/editor/src/app/layout-guard.tsx`（整合进 layout）
- Move: `apps/pwa/src/app/[locale]/editor/page.tsx` → `apps/editor/src/app/page.tsx`
- Move: `apps/pwa/src/app/[locale]/editor/crags/` → `apps/editor/src/app/crags/`
- Move: `apps/pwa/src/app/[locale]/editor/routes/` → `apps/editor/src/app/routes/`
- Move: `apps/pwa/src/app/[locale]/editor/faces/` → `apps/editor/src/app/faces/`
- Move: `apps/pwa/src/app/[locale]/editor/betas/` → `apps/editor/src/app/betas/`
- Move: `apps/pwa/src/app/[locale]/editor/users/` → `apps/editor/src/app/users/`
- Move: `apps/pwa/src/app/[locale]/editor/cities/` → `apps/editor/src/app/cities/`

**Step 1: 移动页面文件**

```bash
# 移动 editor 页面（去掉 [locale] 前缀 — Editor 无 i18n）
git mv apps/pwa/src/app/\[locale\]/editor/page.tsx apps/editor/src/app/page.tsx

for dir in crags routes faces betas users cities; do
  mkdir -p "apps/editor/src/app/${dir}"
  git mv "apps/pwa/src/app/[locale]/editor/${dir}/" "apps/editor/src/app/${dir}/"
done

# crags/[id] 子目录
mkdir -p apps/editor/src/app/crags/\[id\]
# (已随 crags/ 目录一起移动)
```

**Step 2: 更新 import 路径**

Editor 页面中的 import 需要调整：

```typescript
// 旧 (PWA 内部)
import { useSession } from '@/lib/auth-client'
import { Input } from '@/components/ui/input'
import type { Crag } from '@/types'
import { getGradeColor } from '@/lib/tokens'

// 新 (Editor 使用 packages)
import { useSession } from '@/lib/auth-client'          // Editor 自己的 auth-client
import { Input } from '@bloctop/ui/components/input'     // 从 packages/ui
import type { Crag } from '@bloctop/shared/types'        // 从 packages/shared
import { getGradeColor } from '@bloctop/shared/tokens'   // 从 packages/shared
```

**关键 import 映射表：**

| 旧 import (PWA) | 新 import (Editor) |
|---|---|
| `@/types` | `@bloctop/shared/types` |
| `@/lib/auth-client` | `@/lib/auth-client`（Editor 自己的） |
| `@/lib/auth` | `@/lib/auth`（Editor 自己的） |
| `@/lib/tokens` | `@bloctop/shared/tokens` |
| `@/lib/grade-utils` | `@bloctop/shared/grade-utils` |
| `@/lib/city-utils` | `@bloctop/shared/city-utils` |
| `@/lib/constants` | `@bloctop/shared/constants` |
| `@/lib/topo-utils` | `@bloctop/shared/topo-utils` |
| `@/lib/topo-constants` | `@bloctop/shared/topo-constants` |
| `@/lib/editor-utils` | `@bloctop/shared/editor-utils` |
| `@/lib/editor-areas` | `@bloctop/shared/editor-areas` |
| `@/lib/permissions` | `@bloctop/shared/permissions` |
| `@/lib/filter-constants` | `@bloctop/shared/filter-constants` |
| `@/lib/beta-constants` | `@bloctop/shared/beta-constants` |
| `@/lib/crag-theme` | `@bloctop/shared/crag-theme` |
| `@/components/ui/*` | `@bloctop/ui/components/*` |
| `@/components/editor/*` | `@/components/editor/*`（Editor 本地） |
| `@/components/face-image-provider` | `@bloctop/ui/face-image/face-image-provider` |
| `@/hooks/use-face-image` | `@bloctop/ui/face-image/use-face-image` |

**Step 3: 整合 auth guard 到 Editor layout**

```typescript
// apps/editor/src/app/layout.tsx
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import { canAccessEditor } from '@bloctop/shared/permissions'
import { ThemeProvider } from '@bloctop/ui/theme/theme-provider'
import { FaceImageProvider } from '@bloctop/ui/face-image/face-image-provider'
import './globals.css'

export const metadata: Metadata = {
  title: '寻岩记 · 编辑器',
  description: '岩场管理与数据标记服务',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth guard
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    redirect(`${process.env.NEXT_PUBLIC_PWA_URL || 'https://bouldering.top'}/zh/login`)
  }

  const role = (session.user as { role?: string }).role || 'user'
  const hasAccess = await canAccessEditor(session.user.id, role as 'admin' | 'user')
  if (!hasAccess) {
    redirect(`${process.env.NEXT_PUBLIC_PWA_URL || 'https://bouldering.top'}/zh/login`)
  }

  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FaceImageProvider>
            {children}
          </FaceImageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Step 4: 移除 next-intl 相关代码**

Editor 页面中如果有 `useTranslations()` 调用（审查发现没有），需要替换为硬编码中文。

同时删除 Editor 页面中的 `usePathname` from `@/i18n/navigation` — 改用 Next.js 原生 `usePathname`：

```typescript
// 旧: import { usePathname, useRouter } from '@/i18n/navigation'
// 新: import { usePathname, useRouter } from 'next/navigation'
```

**Step 5: 验证构建**

```bash
pnpm run build --filter=@bloctop/editor
```

**Step 6: Commit**

```bash
git commit -m "feat: migrate editor pages to apps/editor"
```

---

### Task 11: 迁移 Editor 组件 + hooks

**Files:**
- Move: `apps/pwa/src/components/editor/*.tsx` (8 files) → `apps/editor/src/components/editor/`
- Move: `apps/pwa/src/hooks/use-crag-routes.ts` → `apps/editor/src/hooks/use-crag-routes.ts`
- Move: `apps/pwa/src/hooks/use-break-app-shell-limit.tsx` → `apps/editor/src/hooks/use-break-app-shell-limit.tsx`

**Step 1: 移动组件**

```bash
mkdir -p apps/editor/src/components/editor
for f in area-select beta-card crag-permissions-panel crag-selector \
         editor-page-header fullscreen-topo-editor progress-ring route-card; do
  git mv "apps/pwa/src/components/editor/${f}.tsx" "apps/editor/src/components/editor/${f}.tsx"
done
```

**Step 2: 移动 hooks**

```bash
mkdir -p apps/editor/src/hooks
git mv apps/pwa/src/hooks/use-crag-routes.ts apps/editor/src/hooks/use-crag-routes.ts
git mv apps/pwa/src/hooks/use-break-app-shell-limit.tsx apps/editor/src/hooks/use-break-app-shell-limit.tsx
```

**Step 3: 更新 import（同 Task 10 映射表）**

**Step 4: 验证 + Commit**

```bash
pnpm run build --filter=@bloctop/editor
git commit -m "feat: migrate editor components and hooks to apps/editor"
```

---

### Task 12: 迁移 Editor API 路由

**Files:**
- Copy: 以下 API route 到 `apps/editor/src/app/api/`：
  - `crags/route.ts`（GET + POST）
  - `crags/[id]/route.ts`（GET + PATCH + DELETE）
  - `crags/[id]/areas/route.ts`（PATCH）
  - `routes/route.ts`（POST — Editor 需要创建线路）
  - `routes/[id]/route.ts`（GET + PATCH + DELETE）
  - `faces/route.ts`（GET + PATCH + DELETE）
  - `upload/route.ts`（POST）
  - `beta/route.ts`（GET + POST + PATCH + DELETE）
  - `cities/route.ts`（GET + POST）
  - `cities/[id]/route.ts`（PATCH + DELETE）
  - `prefectures/route.ts`（GET + POST）
  - `prefectures/[id]/route.ts`（PATCH + DELETE）
  - `crag-permissions/route.ts`（GET + POST + DELETE）
  - `editor/crags/route.ts`（GET）
  - `editor/search-users/route.ts`（GET）

> **策略**: 这些文件是 **复制** 而非移动，因为 PWA 仍需保留 GET handler（Phase 3 清理时再删除 PWA 的写入方法）。

**Step 1: 复制 API routes**

```bash
# 创建目录结构
mkdir -p apps/editor/src/app/api/{crags/\[id\]/areas,routes/\[id\],faces,upload,beta,cities/\[id\],prefectures/\[id\],crag-permissions,editor/{crags,search-users}}

# 复制路由文件
cp apps/pwa/src/app/api/crags/route.ts apps/editor/src/app/api/crags/route.ts
cp apps/pwa/src/app/api/crags/\[id\]/route.ts apps/editor/src/app/api/crags/\[id\]/route.ts
# ... (对所有 API route 重复)
```

**Step 2: 更新 import 路径**

API routes 中的 import 映射：
```typescript
// 旧
import { requireAuth } from '@/lib/require-auth'
import { getAllCrags } from '@/lib/db'
import { canEditCrag } from '@/lib/permissions'
import { revalidateCragPages } from '@/lib/revalidate-helpers'

// 新 — 使用 packages
import { requireAuth } from '@bloctop/shared/require-auth'
import { getAllCrags } from '@bloctop/shared/db'
import { canEditCrag } from '@bloctop/shared/permissions'
// revalidate-helpers 在 Editor 中需替换为 revalidate-pwa webhook（Task 13）
```

**Step 3: 验证 + Commit**

```bash
pnpm run build --filter=@bloctop/editor
git commit -m "feat: copy API routes to apps/editor with updated imports"
```

---

### Task 13: 实现 revalidate-pwa.ts webhook

**Files:**
- Create: `apps/editor/src/lib/revalidate-pwa.ts`
- Modify: Editor API routes — 将 `revalidatePath()` 替换为 `revalidatePwa()` webhook 调用

**Step 1: 创建 webhook 发送端**

```typescript
// apps/editor/src/lib/revalidate-pwa.ts
const PWA_URL = process.env.PWA_URL           // https://bouldering.top
const SECRET = process.env.REVALIDATE_SECRET  // 与 PWA 共享的密钥

const LOCALES = ['zh', 'en', 'fr'] as const

export async function revalidatePwa(options: {
  paths?: string[]          // e.g. ['/crag/yuan-tong-si']
  tags?: string[]           // e.g. ['crag-yuan-tong-si']
}) {
  if (!PWA_URL || !SECRET) {
    console.warn('[revalidate-pwa] Missing PWA_URL or REVALIDATE_SECRET')
    return
  }

  const localizedPaths = options.paths?.flatMap(p =>
    LOCALES.map(locale => `/${locale}${p}`)
  ) ?? []

  try {
    const res = await fetch(`${PWA_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`,
      },
      body: JSON.stringify({
        paths: localizedPaths,
        tags: options.tags,
      }),
    })

    if (!res.ok) {
      console.error(`[revalidate-pwa] Failed: ${res.status}`)
    }
  } catch (error) {
    // Webhook 失败不阻塞 editor 操作 — ISR 作为安全网
    console.error('[revalidate-pwa] Webhook failed:', error)
  }
}

/** 便捷函数: 重验证岩场相关页面 */
export async function revalidateCragPages(cragId: string) {
  await revalidatePwa({
    paths: [`/crag/${cragId}`, '/'],
  })
}

/** 便捷函数: 重验证首页 */
export async function revalidateHomePage() {
  await revalidatePwa({ paths: ['/'] })
}
```

**Step 2: 替换 Editor API routes 中的 revalidation**

在 Editor 的所有写入 API route 中：
```typescript
// 旧 (直接调用 Next.js ISR)
import { revalidateCragPages } from '@bloctop/shared/revalidate-helpers'
// or
import { revalidatePath } from 'next/cache'

// 新 (通过 webhook 通知 PWA)
import { revalidateCragPages, revalidateHomePage } from '@/lib/revalidate-pwa'
```

调用方式不变（函数签名一致），但底层从 `revalidatePath()` 变为 HTTP POST webhook。

**Step 3: 添加 revalidate-pwa 测试**

```typescript
// apps/editor/src/lib/revalidate-pwa.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ... mock fetch, test revalidatePwa, revalidateCragPages, revalidateHomePage
// 验证: POST 到正确 URL, 包含 Bearer token, 正确的 localized paths
// 验证: fetch 失败不抛异常
```

**Step 4: 验证 + Commit**

```bash
pnpm run build --filter=@bloctop/editor
git commit -m "feat: implement revalidate-pwa webhook for editor → PWA cache invalidation"
```

---

## 阶段 2e: PWA 切换 import

### Task 14: 批量更新 PWA import 路径

**目标**: 将 PWA 中所有 `@/types`、`@/lib/*` 的 import 从 re-export 桥替换为直接使用 `@bloctop/shared/*` 和 `@bloctop/ui/*`。

**Step 1: 使用自动化脚本批量替换**

主要替换模式：

```
@/types                    → @bloctop/shared/types
@/lib/db                   → @bloctop/shared/db
@/lib/mongodb              → @bloctop/shared/mongodb
@/lib/permissions          → @bloctop/shared/permissions
@/lib/require-auth         → @bloctop/shared/require-auth
@/lib/logger               → @bloctop/shared/logger
@/lib/constants            → @bloctop/shared/constants
@/lib/tokens               → @bloctop/shared/tokens
@/lib/utils                → @bloctop/shared/utils
@/lib/grade-utils          → @bloctop/shared/grade-utils
@/lib/city-utils           → @bloctop/shared/city-utils
@/lib/topo-utils           → @bloctop/shared/topo-utils
@/lib/topo-constants       → @bloctop/shared/topo-constants
@/lib/beta-constants       → @bloctop/shared/beta-constants
@/lib/filter-constants     → @bloctop/shared/filter-constants
@/lib/route-utils          → @bloctop/shared/route-utils
@/lib/crag-theme           → @bloctop/shared/crag-theme
@/lib/rate-limit           → @bloctop/shared/rate-limit
@/lib/request-utils        → @bloctop/shared/request-utils
@/lib/api-error-codes      → @bloctop/shared/api-error-codes
@/components/ui/button     → @bloctop/ui/components/button
@/components/ui/input      → @bloctop/ui/components/input
@/components/ui/textarea   → @bloctop/ui/components/textarea
@/components/ui/drawer     → @bloctop/ui/components/drawer
@/components/ui/skeleton   → @bloctop/ui/components/skeleton
@/components/ui/toast      → @bloctop/ui/components/toast
@/components/ui/badge      → @bloctop/ui/components/badge
@/components/ui/image-viewer → @bloctop/ui/components/image-viewer
@/components/ui/segmented-control → @bloctop/ui/components/segmented-control
@/components/face-image-provider → @bloctop/ui/face-image/face-image-provider
@/components/face-thumbnail-strip → @bloctop/ui/face-image/face-thumbnail-strip
@/hooks/use-face-image     → @bloctop/ui/face-image/use-face-image
@/components/theme-provider → @bloctop/ui/theme/theme-provider
@/components/theme-switcher → @bloctop/ui/theme/theme-switcher
```

> **注意**: `@/lib/auth` 和 `@/lib/auth-client` 保留在 `apps/pwa/src/lib/` — 这是 PWA 自己的 auth 实例，不提取到 shared。

**Step 2: 删除 re-export 桥文件**

移除所有在 Task 1-6 创建的 re-export 桥文件。

**Step 3: 验证**

```bash
pnpm run build && pnpm run test:run
```

**Step 4: Commit**

```bash
git commit -m "refactor: update PWA imports to use @bloctop/shared and @bloctop/ui directly"
```

---

### Task 15: 清理 PWA editor 残留

**目标**: 此时 PWA 的 `apps/pwa/src/app/[locale]/editor/` 仍存在原始 editor 页面（Task 10 是 git mv，已移走）。确认无残留。

**Step 1: 检查 editor 目录是否清空**

```bash
ls -la apps/pwa/src/app/\[locale\]/editor/
ls -la apps/pwa/src/components/editor/
```

如果 editor 目录已空（因为 Task 10-11 用了 git mv），删除空目录。

**Step 2: 更新 PWA editor layout 为重定向**

```typescript
// apps/pwa/src/app/[locale]/editor/layout.tsx
import { redirect } from 'next/navigation'

export default function EditorLayout() {
  // Phase 3 完成后，editor 入口改为重定向到独立 Editor 域名
  redirect(process.env.NEXT_PUBLIC_EDITOR_URL || 'https://editor.bouldering.top')
}
```

> **注意**: 暂时保留这个 layout 作为"软重定向"，防止用户访问旧 URL 404。Phase 3 可以完全移除。

**Step 3: Commit**

```bash
git commit -m "chore: clean up PWA editor residuals, add redirect to editor domain"
```

---

## 阶段 2f: 验证

### Task 16: 全量验证 + 最终 commit

**Step 1: 验证 PWA 构建 + 测试**

```bash
pnpm run build --filter=@bloctop/pwa
pnpm run test:run --filter=@bloctop/pwa
pnpm run lint --filter=@bloctop/pwa
```

**Step 2: 验证 Editor 构建**

```bash
pnpm run build --filter=@bloctop/editor
```

**Step 3: 验证 Turborepo 完整构建**

```bash
pnpm run build
pnpm run typecheck
```

**Step 4: 本地 E2E 验证**

1. 启动 PWA: `pnpm run dev --filter=@bloctop/pwa` (port 3000)
2. 启动 Editor: `pnpm run dev --filter=@bloctop/editor` (port 3001)
3. 手动验证:
   - PWA 首页正常加载
   - PWA 岩场详情页正常
   - Editor 首页需要登录（重定向到 PWA login）
   - Editor 登录后能看到编辑器入口页面

**Step 5: Commit + Push**

```bash
git commit -m "feat: Phase 2 complete — Editor app with shared packages"
git push origin HEAD
```

---

## 环境变量清单

### Editor App 需要的环境变量

| 变量 | 说明 | 与 PWA 的关系 |
|------|------|-------------|
| `MONGODB_URI` | MongoDB 连接串 | **相同** |
| `MONGODB_DB_NAME` | 数据库名 | **相同** |
| `BETTER_AUTH_SECRET` | Session 签名密钥 | **⚠️ 必须不同** |
| `NEXT_PUBLIC_APP_URL` | Editor 自身 URL | `https://editor.bouldering.top` |
| `NEXT_PUBLIC_PWA_URL` | PWA URL (登录重定向) | `https://bouldering.top` |
| `PWA_URL` | PWA 服务端 URL (webhook) | `https://bouldering.top` |
| `REVALIDATE_SECRET` | Webhook 认证密钥 | **相同** |
| `NEXT_PUBLIC_AMAP_KEY` | 高德地图 Key | **相同** |
| `CLOUDFLARE_ACCOUNT_ID` | R2 账户 | **相同** |
| `R2_ACCESS_KEY_ID` | R2 Key | **相同** |
| `R2_SECRET_ACCESS_KEY` | R2 Secret | **相同** |
| `R2_BUCKET_NAME` | R2 桶名 | **相同** |
| `RESEND_API_KEY` | 邮件发送 | **可相同** |

---

## 风险与回退

| 风险 | 缓解 |
|------|------|
| CSS import workspace 包不工作 | 复制 globals.css 到 apps/editor |
| `transpilePackages` 不识别 workspace TS | 使用 `next-transpile-modules` 或在 packages 中添加构建步骤 |
| Re-export 桥导致类型推断问题 | Task 14 尽早执行，减少桥存在时间 |
| Editor auth cookie 冲突 | 不同 BETTER_AUTH_SECRET + 不同域名 + 不同 cookie |
| 测试 mock 路径变更 | 更新 vitest.config.ts 中的 alias 配置 |

---

## 依赖关系

```
Task 1 (types) ──→ Task 2 (db) ──→ Task 3 (permissions) ──→ Task 4 (utils)
                                                                    │
Task 5 (UI components) ←────────────────────────────────────────────┘
    │
Task 6 (face-image + theme)
    │
Task 7 (editor skeleton) ──→ Task 8 (editor auth) ──→ Task 9 (editor proxy)
                                                            │
Task 10 (pages) ←───────────────────────────────────────────┘
    │
Task 11 (components + hooks)
    │
Task 12 (API routes) ──→ Task 13 (revalidate webhook)
                              │
Task 14 (PWA import cleanup) ←┘
    │
Task 15 (PWA editor redirect)
    │
Task 16 (final verification)
```
