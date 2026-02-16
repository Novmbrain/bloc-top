# Phase 3: PWA 清理 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 清理 PWA 中 editor 迁移后的残留代码，将 Profile 编辑器入口改为外部链接，删除死代码和无消费者的 re-export bridge。

**Architecture:** Phase 2 将 editor 页面/组件/hooks/API 路由迁移到 `apps/editor`，但 PWA 中残留了空壳目录、死代码 bridge 文件、以及指向 `/editor` 的内部链接。Phase 3 聚焦于三件事：(1) 删除死代码；(2) 修复 Profile→Editor 入口链接；(3) 清理零消费者 bridge 文件。高消费者 bridge（如 types 50 个引用、db 28 个引用）暂不迁移 — 功能正常，风险收益比不划算。

**Tech Stack:** Next.js 16.1, next-intl, React 19, Turborepo, pnpm workspaces

**Reference:** `docs/plans/2026-02-15-editor-split-design.md` Phase 3 章节

---

## 调研数据摘要

### 待删除的死代码

| 文件 | 原因 |
|------|------|
| `apps/pwa/src/app/[locale]/editor/layout.tsx` | 空壳 auth guard — 无子页面 |
| `apps/pwa/src/components/editor/` | 空目录 |
| `apps/pwa/src/hooks/use-break-app-shell-limit.ts` | 0 个消费者 |
| `apps/pwa/src/lib/editor-utils.ts` | 0 个消费者的 bridge |
| `apps/pwa/src/lib/editor-areas.ts` | 0 个消费者的 bridge |
| `apps/pwa/src/components/ui/button.tsx` | 0 个消费者的 bridge |
| `apps/pwa/src/components/ui/badge.tsx` | 0 个消费者的 bridge |
| `apps/pwa/src/components/ui/composition-input.tsx` | 0 个消费者的 bridge |
| `apps/pwa/src/app/api/editor/search-users/route.ts` | 仅 editor UI 使用，已迁移 |

### 需修改的文件

| 文件 | 变更 |
|------|------|
| `apps/pwa/src/components/security-drawer.tsx:719-732` | `<Link href="/editor">` → `<a href={editorUrl}>` |
| `apps/pwa/src/app/[locale]/profile/page.tsx:60-71` | 保留 access check 逻辑不变 |
| `apps/pwa/messages/zh.json` | 更新 `editorEntry` 文案（加"前往"暗示外部跳转） |

### 不动的 bridge 文件（高消费者数 — 后续单独 PR）

| Bridge | 消费者数 |
|--------|---------|
| `types/index.ts` | 50 |
| `lib/db/index.ts` | 28 |
| `lib/logger.ts` | 24 |
| `lib/permissions.ts` | 18 |
| `lib/require-auth.ts` | 17 (含 binding 逻辑) |
| ... 其余 17 个 | 1-10 各 |

---

## Task 1: 删除空壳 Editor 目录和空目录

**Files:**
- Delete: `apps/pwa/src/app/[locale]/editor/layout.tsx`
- Delete: `apps/pwa/src/components/editor/` (empty directory)

**Step 1: 确认 editor layout 没有其他引用**

Run: `grep -r "editor/layout" apps/pwa/src/ --include="*.ts" --include="*.tsx" | head -20`
Expected: No results (Next.js App Router auto-discovers layout.tsx, no explicit imports)

**Step 2: 删除文件**

```bash
git rm apps/pwa/src/app/\[locale\]/editor/layout.tsx
rm -rf apps/pwa/src/components/editor/
```

**Step 3: 验证构建**

Run: `pnpm --filter @bloctop/pwa typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove empty editor layout and directory from PWA"
```

---

## Task 2: 删除 PWA 中零消费者的 bridge 文件和死代码

**Files:**
- Delete: `apps/pwa/src/lib/editor-utils.ts` (0 consumers)
- Delete: `apps/pwa/src/lib/editor-areas.ts` (0 consumers)
- Delete: `apps/pwa/src/hooks/use-break-app-shell-limit.ts` (0 consumers)
- Delete: `apps/pwa/src/components/ui/button.tsx` (0 consumers)
- Delete: `apps/pwa/src/components/ui/badge.tsx` (0 consumers)
- Delete: `apps/pwa/src/components/ui/composition-input.tsx` (0 consumers)

**Step 1: 确认零消费者**

对每个文件，确认没有引用：

```bash
# editor-utils
grep -r "editor-utils" apps/pwa/src/ --include="*.ts" --include="*.tsx" -l
# editor-areas
grep -r "editor-areas" apps/pwa/src/ --include="*.ts" --include="*.tsx" -l
# use-break-app-shell-limit
grep -r "use-break-app-shell-limit" apps/pwa/src/ --include="*.ts" --include="*.tsx" -l
# button (注意: 需要排除自身)
grep -r "from.*ui/button" apps/pwa/src/ --include="*.ts" --include="*.tsx" -l
# badge
grep -r "from.*ui/badge" apps/pwa/src/ --include="*.ts" --include="*.tsx" -l
# composition-input (注意: input.tsx 内部可能引用)
grep -r "composition-input" apps/pwa/src/ --include="*.ts" --include="*.tsx" -l
```

Expected: 每个只返回自身文件（bridge 文件本身），或无结果。

> **⚠️ 注意**: `composition-input` 可能被 `input.tsx` 内部引用。如果 `input.tsx` bridge 引用了它，需要确认 `input.tsx` bridge 自身是否引用本地 `composition-input` 还是 `@bloctop/ui` 的版本。如果引用本地版本，则不能删除。

**Step 2: 删除文件**

```bash
git rm apps/pwa/src/lib/editor-utils.ts
git rm apps/pwa/src/lib/editor-areas.ts
git rm apps/pwa/src/hooks/use-break-app-shell-limit.ts
git rm apps/pwa/src/components/ui/button.tsx
git rm apps/pwa/src/components/ui/badge.tsx
# composition-input.tsx 仅在 Step 1 确认安全后删除
git rm apps/pwa/src/components/ui/composition-input.tsx
```

**Step 3: 验证**

Run: `pnpm --filter @bloctop/pwa typecheck && pnpm --filter @bloctop/pwa test:run`
Expected: typecheck PASS, all tests PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove zero-consumer bridge files and dead editor code from PWA"
```

---

## Task 3: 删除 PWA 中仅 Editor 使用的 API 路由

**Files:**
- Delete: `apps/pwa/src/app/api/editor/search-users/route.ts`
- Keep: `apps/pwa/src/app/api/editor/crags/route.ts` (Profile 页面仍需要)
- Keep: `apps/pwa/src/app/api/editor/crags/route.test.ts`

**Step 1: 确认 search-users 仅被 editor 使用**

```bash
grep -r "search-users" apps/pwa/src/ --include="*.ts" --include="*.tsx" -l
```

Expected: 只返回 `apps/pwa/src/app/api/editor/search-users/route.ts`

**Step 2: 删除**

```bash
git rm apps/pwa/src/app/api/editor/search-users/route.ts
```

**Step 3: 验证**

Run: `pnpm --filter @bloctop/pwa typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove editor-only search-users API route from PWA"
```

---

## Task 4: 将 Profile 编辑器入口改为外部链接

**Files:**
- Modify: `apps/pwa/src/components/security-drawer.tsx:719-732`
- Modify: `apps/pwa/messages/zh.json` (editorEntry 文案)
- Modify: `apps/pwa/messages/en.json` (editorEntry 文案)
- Modify: `apps/pwa/messages/fr.json` (editorEntry 文案)

**背景**: 当前 `<Link href="/editor">` 指向 PWA 内部路由（Phase 2 后已无页面 → 404）。需改为指向独立 Editor 域名。

**Step 1: 在 security-drawer.tsx 中替换编辑器入口链接**

将 `security-drawer.tsx` 第 719-732 行改为：

```tsx
        {/* Editor entry (admin or manager with crag permissions) */}
        {hasEditorAccess && (
          <a
            href={process.env.NEXT_PUBLIC_EDITOR_URL || 'https://editor.bouldering.top'}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-light w-full flex items-center gap-3 p-3 transition-all active:scale-[0.98]"
            style={{ borderRadius: 'var(--theme-radius-lg)' }}
          >
            <Edit3 className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>
              {t('editorEntry')}
            </span>
            <ExternalLink className="w-4 h-4" style={{ color: 'var(--theme-on-surface-variant)' }} />
          </a>
        )}
```

**关键变更：**
- `<Link>` (next-intl client routing) → `<a>` (外部链接)
- 添加 `target="_blank"` + `rel="noopener noreferrer"`
- `ChevronRight` 图标 → `ExternalLink` 图标（暗示跳到外部站点）
- 使用 `NEXT_PUBLIC_EDITOR_URL` 环境变量，fallback `https://editor.bouldering.top`

**Step 2: 确认 ExternalLink 已导入**

在 `security-drawer.tsx` 的 lucide-react import 行中添加 `ExternalLink`：

```tsx
import { ..., ExternalLink } from 'lucide-react'
```

同时检查 `ChevronRight` 是否还被其他地方使用。如果不再使用，从 import 中移除。

**Step 3: 如果需要，移除未使用的 `Link` import**

检查 security-drawer 中 `<Link>` 是否仍有其他使用。如果 editor entry 是唯一的 `<Link>`，则移除 import：

```tsx
// 如果不再需要
- import { Link } from '@/i18n/navigation'
```

**Step 4: 更新翻译文案**

`apps/pwa/messages/zh.json` — Profile 命名空间:
```json
"editorEntry": "前往 Topo 编辑器",
"editorEntryHint": "岩场数据管理与线路标注"
```

`apps/pwa/messages/en.json`:
```json
"editorEntry": "Go to Topo Editor",
"editorEntryHint": "Crag data management and route annotation"
```

`apps/pwa/messages/fr.json`:
```json
"editorEntry": "Aller à l'éditeur Topo",
"editorEntryHint": "Gestion des données de site et annotation d'itinéraires"
```

**Step 5: 添加 NEXT_PUBLIC_EDITOR_URL 到 turbo.json globalEnv**

```json
// turbo.json — globalEnv 数组中添加
"NEXT_PUBLIC_EDITOR_URL"
```

**Step 6: 验证**

Run: `pnpm --filter @bloctop/pwa typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add apps/pwa/src/components/security-drawer.tsx apps/pwa/messages/ turbo.json
git commit -m "feat: redirect editor entry to external editor.bouldering.top domain"
```

---

## Task 5: 最终验证 + 文档更新

**Files:**
- Verify: full build + test suite
- Modify: `docs/plans/2026-02-15-editor-split-design.md` (Phase 3 标记完成)

**Step 1: 全量构建**

Run: `pnpm build`
Expected: All 4 packages build successfully

**Step 2: 运行测试**

Run: `pnpm --filter @bloctop/shared test:run && pnpm --filter @bloctop/pwa test:run`
Expected: All tests pass

**Step 3: TypeScript 检查**

Run: `pnpm turbo typecheck`
Expected: All 4 packages pass

**Step 4: 更新设计文档**

在 `docs/plans/2026-02-15-editor-split-design.md` 的 Phase 3 部分标记为已完成，记录 commit hash。

**Step 5: Commit**

```bash
git add docs/plans/2026-02-15-editor-split-design.md
git commit -m "docs: mark Phase 3 PWA cleanup as complete"
```

---

## 范围边界说明

### 本次包含
- 删除死代码（空目录、0 消费者 bridge、editor-only API 路由）
- Profile 编辑器入口改外部链接
- 翻译文案更新

### 本次不包含（后续 PR）
- **高消费者 bridge 迁移**：`types/index.ts` (50 引用)、`db/index.ts` (28 引用) 等。这些 bridge 文件功能完全正常，迁移涉及 200+ 文件修改，风险收益比不划算。建议作为独立 PR 按模块逐步迁移。
- **PWA 写入 API 路由清理**：当前 PWA 保留了 `/api/crags` POST、`/api/routes` POST 等写入端点。Editor 独立后，理论上可以移除 PWA 的写入端点。但需要确认没有其他客户端调用（如 Beta 提交走 PWA 自身）。建议作为 Phase 4 评估。
- **Vercel 部署配置**：创建 Editor Vercel Project、配置域名和环境变量。属于 Phase 4 部署阶段。
