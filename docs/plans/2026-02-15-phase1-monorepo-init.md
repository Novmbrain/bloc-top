# Phase 1: Monorepo 初始化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将现有单体 Next.js 项目转换为 Turborepo monorepo 结构，当前代码移入 `apps/pwa/`，创建空的 `packages/shared` 和 `packages/ui`，确保 build + test + lint 全部通过。

**Architecture:** 使用 pnpm workspaces + Turborepo 替代当前的 npm + Nx。现有代码原封不动移入 `apps/pwa/`，所有配置文件保持工作状态。不移动任何代码到 packages — 那是 Phase 2 的事。

**Tech Stack:** Turborepo, pnpm workspaces, Next.js 16, Vitest, Playwright

---

## Task 1: 切换到 pnpm

**Files:**
- Delete: `package-lock.json`
- Create: `.npmrc`
- Modify: `.husky/pre-commit`
- Modify: `.husky/pre-push`

**Context:** Turborepo 推荐 pnpm workspaces。需要从 npm 切换到 pnpm，并更新 git hooks 中的 npm 引用。

**Step 1: 安装 pnpm（如果未安装）**

Run: `corepack enable && corepack prepare pnpm@latest --activate`
或: `npm install -g pnpm`

**Step 2: 创建 .npmrc**

```
shamefully-hoist=true
```

> `shamefully-hoist=true` 确保依赖被提升到 node_modules 根层，避免 Next.js 和某些包的兼容性问题。

**Step 3: 删除 npm lock 文件，用 pnpm 安装**

```bash
rm package-lock.json
rm -rf node_modules
pnpm install
```

**Step 4: 更新 git hooks 中的 npm 命令**

`.husky/pre-commit` 中 `npx lint-staged` → `pnpm exec lint-staged`

`.husky/pre-push` 中所有 `npm run` → `pnpm run`，`npx` → `pnpm exec`

**Step 5: 更新 package.json scripts**

检查 package.json 中是否有 `npm run` 的交叉引用，改为 `pnpm run`。

**Step 6: 验证**

Run: `pnpm run build`
Run: `pnpm run test:run`
Run: `pnpm run lint`
Expected: 全部通过

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: switch from npm to pnpm

Prerequisite for Turborepo monorepo. Replaces package-lock.json
with pnpm-lock.yaml, updates hooks to use pnpm commands."
```

---

## Task 2: 移动代码到 apps/pwa/

**Files:**
- Create: `apps/pwa/` (move everything except root config)
- Keep at root: `turbo.json`, `pnpm-workspace.yaml`, root `package.json`, `.gitignore`, `.husky/`, `docs/`

**Context:** 这是最关键也最危险的步骤 — 将所有项目文件移入 `apps/pwa/` 子目录。需要非常仔细地处理路径引用。

**Step 1: 创建目录结构**

```bash
mkdir -p apps/pwa
```

**Step 2: 移动项目文件到 apps/pwa/**

将以下内容移入 `apps/pwa/`：
- `src/` → `apps/pwa/src/`
- `public/` → `apps/pwa/public/`
- `messages/` → `apps/pwa/messages/`
- `scripts/` → `apps/pwa/scripts/`
- `playwright/` → `apps/pwa/playwright/`
- `next.config.ts` → `apps/pwa/next.config.ts`
- `tsconfig.json` → `apps/pwa/tsconfig.json`
- `vitest.config.ts` → `apps/pwa/vitest.config.ts`
- `playwright-ct.config.ts` → `apps/pwa/playwright-ct.config.ts`
- `postcss.config.mjs` → `apps/pwa/postcss.config.mjs`
- `eslint.config.mjs` → `apps/pwa/eslint.config.mjs`
- `components.json` → `apps/pwa/components.json`
- `next-env.d.ts` → `apps/pwa/next-env.d.ts`
- `.env.local` → `apps/pwa/.env.local`（不提交）

**保留在项目根目录：**
- `.gitignore`（更新路径）
- `.husky/`
- `.nvmrc`
- `docs/`
- `README.md`

**Step 3: 创建 apps/pwa/package.json**

将现有 `package.json` 复制到 `apps/pwa/package.json`，修改：
- `name`: `"bloc-top"` → `"@bloctop/pwa"`
- 保留所有 dependencies, devDependencies, scripts
- 移除 nx 相关配置 (`nx` 字段)
- 移除 lint-staged 配置（移到根 package.json）

**Step 4: 创建根 package.json**

```json
{
  "name": "bloctop",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test:run",
    "test:ct": "turbo run test:ct",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "packageManager": "pnpm@10.11.0"
}
```

**Step 5: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 6: 创建 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test:run": {
      "dependsOn": ["^build"]
    },
    "test:ct": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Step 7: 移除 Nx**

```bash
# 从 apps/pwa/package.json 移除 nx 依赖
# 删除根目录的 nx.json
rm nx.json
```

从 `apps/pwa/package.json` 的 devDependencies 中移除：
- `nx`
- `@nx/workspace`

从 scripts 中移除 nx 引用：
- `"ci": "nx run-many ..."` → `"ci": "pnpm run lint && pnpm run typecheck && pnpm run test:run && pnpm run test:ct"`

**Step 8: 更新 .gitignore**

添加 Turborepo 缓存忽略：
```
.turbo
```

**Step 9: 重新安装依赖**

```bash
rm -rf node_modules apps/pwa/node_modules
pnpm install
```

**Step 10: 验证一切正常**

```bash
pnpm run build          # Turborepo 构建 PWA
pnpm run test --filter=@bloctop/pwa   # Vitest
pnpm run lint           # ESLint
pnpm run typecheck      # TypeScript
```

Expected: 全部通过

**Step 11: Commit**

```bash
git add -A
git commit -m "refactor: restructure to Turborepo monorepo

Moves existing code to apps/pwa/, replaces Nx with Turborepo,
adds pnpm-workspace.yaml. All tests and build still pass.
No code changes, only file moves and config updates."
```

---

## Task 3: 创建空的 packages 骨架

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`

**Context:** 为后续 Phase 2 准备空的 packages 骨架。不移动任何代码，只建立目录结构和配置。

**Step 1: 创建 packages/shared**

`packages/shared/package.json`:
```json
{
  "name": "@bloctop/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

`packages/shared/src/index.ts`:
```typescript
// @bloctop/shared — 共享纯逻辑模块（types, db, permissions, utils）
// Phase 2 将从 apps/pwa/src/lib/ 迁入模块
export {}
```

**Step 2: 创建 packages/ui**

`packages/ui/package.json`:
```json
{
  "name": "@bloctop/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  }
}
```

`packages/ui/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

`packages/ui/src/index.ts`:
```typescript
// @bloctop/ui — 共享 React 组件和样式
// Phase 2 将从 apps/pwa/src/components/ 迁入共享组件
export {}
```

**Step 3: 重新安装**

```bash
pnpm install
```

**Step 4: 验证 monorepo 结构**

```bash
pnpm ls --depth 0 -r  # 列出所有 workspace packages
```

Expected output 包含：
- `@bloctop/pwa`
- `@bloctop/shared`
- `@bloctop/ui`

**Step 5: 验证构建**

```bash
pnpm run build
pnpm run typecheck
```

Expected: 全部通过

**Step 6: Commit**

```bash
git add packages/
git commit -m "chore: add empty packages/shared and packages/ui skeletons

Prepares package structure for Phase 2 code extraction.
No functionality yet, just workspace configuration."
```

---

## Task 4: 更新 Vercel 配置

**Files:**
- Modify: `vercel.json` (或删除，改用 Vercel Dashboard 配置)

**Context:** Vercel 需要知道 monorepo 中哪个目录是需要构建的 app。

**Step 1: 更新 vercel.json（如果保留）**

移动到 `apps/pwa/vercel.json` 或在 Vercel Dashboard 中设置：
- Root Directory: `apps/pwa`
- Build Command: `cd ../.. && pnpm turbo run build --filter=@bloctop/pwa`
- Install Command: `pnpm install`

**Step 2: 验证 Vercel Preview Deploy**

Push branch，确认 Vercel 能正确构建。

**Step 3: Commit (如有文件变更)**

---

## 风险点

| 风险 | 影响 | 缓解 |
|------|------|------|
| git mv 丢失文件历史 | 低 | `git mv` 保留 rename 追踪，`git log --follow` 可查历史 |
| 路径引用断裂 | 高 | `@/*` alias 在 apps/pwa/tsconfig.json 中仍指向 `./src/*`，内部引用不受影响 |
| Vercel 构建失败 | 中 | 在 preview branch 上验证，不直接推 main |
| pnpm 兼容性 | 低 | `shamefully-hoist=true` 确保依赖提升，兼容现有代码 |
| Husky hooks 路径 | 中 | 需要确认 .husky/ 在 monorepo 根目录仍能正常触发 |

## 完成标准

- [ ] `pnpm run build` 通过
- [ ] `pnpm run test:run` 906 tests 通过
- [ ] `pnpm run test:ct` 通过
- [ ] `pnpm run lint` 通过
- [ ] `pnpm run typecheck` 通过
- [ ] Vercel preview deployment 成功
- [ ] `pnpm ls -r` 显示 3 个 workspace packages
