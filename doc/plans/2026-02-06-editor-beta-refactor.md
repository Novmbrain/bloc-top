# Editor Beta 管理页面重构 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重构 editor beta 管理页面 — 提取共享 hook、提取内联组件、消除重复状态更新、改全量 re-fetch 为乐观更新

**Architecture:** 4 个独立 Task 按依赖顺序执行。Task 1 提取跨 3 页面共享的 hook，Task 2-4 集中重构 beta 页面。不做 EditorPageLayout 抽象（三页面布局变体太多，10+ props 违反 YAGNI）。

**Tech Stack:** React 18 + Next.js App Router + Tailwind CSS v4 + lucide-react icons

---

### Task 1: 提取 `useBreakAppShellLimit` hook

**Context:** 三个 editor 页面（betas, faces, routes）各有一个完全相同的 15 行 `useEffect`，在桌面端移除 app-shell 的 maxWidth 限制。提取为共享 hook。

**Files:**
- Create: `src/hooks/use-break-app-shell-limit.ts`
- Modify: `src/app/[locale]/editor/betas/page.tsx:67-81`
- Modify: `src/app/[locale]/editor/faces/page.tsx:158-173`
- Modify: `src/app/[locale]/editor/routes/page.tsx:127-142`

**Step 1: 创建 hook 文件**

创建 `src/hooks/use-break-app-shell-limit.ts`：

```typescript
'use client'
import { useEffect } from 'react'

/**
 * 桌面端突破 app-shell maxWidth 限制
 * 用于 editor 页面需要全宽双栏布局的场景
 */
export function useBreakAppShellLimit() {
  useEffect(() => {
    const shell = document.getElementById('app-shell')
    if (!shell) return
    const original = shell.style.maxWidth
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const update = (mq: MediaQueryList | MediaQueryListEvent) => {
      shell.style.maxWidth = mq.matches ? 'none' : original
    }
    update(mediaQuery)
    mediaQuery.addEventListener('change', update)
    return () => {
      mediaQuery.removeEventListener('change', update)
      shell.style.maxWidth = original
    }
  }, [])
}
```

**Step 2: 替换 betas/page.tsx**

1. 添加 import: `import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'`
2. 删除 line 67-81 的 useEffect 代码块（从 `// ============ 桌面端突破` 到 `}, [])`）
3. 在同位置添加: `useBreakAppShellLimit()`

**Step 3: 替换 faces/page.tsx**

1. 添加 import: `import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'`
2. 删除 line 158-173 的相同 useEffect 代码块
3. 在同位置添加: `useBreakAppShellLimit()`

**Step 4: 替换 routes/page.tsx**

1. 添加 import: `import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'`
2. 删除 line 127-142 的相同 useEffect 代码块
3. 在同位置添加: `useBreakAppShellLimit()`

**Step 5: 验证**

Run: `npm run lint && npx tsc --noEmit`
Expected: 无错误

**Step 6: Commit**

```bash
git add src/hooks/use-break-app-shell-limit.ts src/app/\[locale\]/editor/betas/page.tsx src/app/\[locale\]/editor/faces/page.tsx src/app/\[locale\]/editor/routes/page.tsx
git commit -m "refactor(editor): extract useBreakAppShellLimit hook shared by 3 pages

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: 提取 `BetaCard` 组件到独立文件

**Context:** `betas/page.tsx` 底部定义了 224 行的内联 `BetaCard` 函数 (line 536-759)，包含编辑表单、删除确认、展示模式。提取到独立文件减少主页面体积。

**Files:**
- Create: `src/components/editor/beta-card.tsx`
- Modify: `src/app/[locale]/editor/betas/page.tsx`

**Step 1: 创建 `src/components/editor/beta-card.tsx`**

从 `betas/page.tsx` line 536-759 整体移动 BetaCard 函数到新文件，添加类型导出：

```typescript
'use client'

import { useState } from 'react'
import {
  BookHeart,
  ExternalLink,
  Pencil,
  Trash2,
  Save,
  Loader2,
  User,
  Ruler,
  MoveHorizontal,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { BETA_PLATFORMS } from '@/lib/beta-constants'
import type { BetaLink } from '@/types'

export interface BetaEditForm {
  title: string
  author: string
  climberHeight: string
  climberReach: string
}

export interface BetaCardProps {
  beta: BetaLink
  isEditing: boolean
  editForm: BetaEditForm
  setEditForm: React.Dispatch<React.SetStateAction<BetaEditForm>>
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: () => void
  isSaving: boolean
  isDeleting: boolean
}

export function BetaCard({ ... }: BetaCardProps) {
  // 原 BetaCard 函数体不变 (line 561-758)
}
```

**Step 2: 更新 `betas/page.tsx`**

1. 删除 line 536-759（整个 BetaCard 函数定义）
2. 添加 import: `import { BetaCard, type BetaEditForm } from '@/components/editor/beta-card'`
3. 更新 line 52-54 的 editForm useState，类型改用 `BetaEditForm`:
   ```typescript
   const [editForm, setEditForm] = useState<BetaEditForm>(
     { title: '', author: '', climberHeight: '', climberReach: '' }
   )
   ```
4. 删除不再需要的 icon imports: `BookHeart`, `Pencil`, `Trash2`, `Save`, `ExternalLink`, `Ruler`, `MoveHorizontal`, `User`
5. 删除不再需要的 import: `BETA_PLATFORMS` from `@/lib/beta-constants`
6. 删除不再需要的 import: `Input` from `@/components/ui/input`（如果页面自身不再使用 Input，需确认 searchQuery 的输入框是否使用 — 检查后确认）

**Step 3: 验证**

Run: `npm run lint && npx tsc --noEmit`
Expected: 无错误

**Step 4: Commit**

```bash
git add src/components/editor/beta-card.tsx src/app/\[locale\]/editor/betas/page.tsx
git commit -m "refactor(editor): extract BetaCard component to dedicated file

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: 合并重复的 routes + selectedRoute 状态更新

**Context:** `handleSaveBeta` 和 `handleDeleteBeta` 都执行相同模式：先 `setRoutes(prev => prev.map(...))` 再 `setSelectedRoute(prev => ...)` 用完全相同的变换逻辑。提取 helper 消除重复，同时避免两个状态更新意外不同步的风险。

**Files:**
- Modify: `src/app/[locale]/editor/betas/page.tsx`

**Step 1: 添加 `updateRouteAndSelected` helper**

在组件内 `handleStartEdit` 之前添加（约在 `handleSelectRoute` 之后）：

```typescript
/** 同步更新 routes 列表和 selectedRoute */
const updateRouteAndSelected = useCallback(
  (routeId: number, transform: (r: Route) => Route) => {
    setRoutes(prev => prev.map(r => r.id === routeId ? transform(r) : r))
    setSelectedRoute(prev => prev && prev.id === routeId ? transform(prev) : prev)
  },
  [setRoutes],
)
```

**Step 2: 简化 `handleSaveBeta`**

替换 line 154-184 的两个 `setRoutes` + `setSelectedRoute` 调用为：

```typescript
// 更新本地状态
const newValues = {
  title: editForm.title.trim() || undefined,
  author: editForm.author.trim() || undefined,
  climberHeight: editForm.climberHeight ? parseInt(editForm.climberHeight, 10) : undefined,
  climberReach: editForm.climberReach ? parseInt(editForm.climberReach, 10) : undefined,
}
updateRouteAndSelected(selectedRoute.id, r => ({
  ...r,
  betaLinks: (r.betaLinks || []).map(b =>
    b.id === betaId ? { ...b, ...newValues } : b
  ),
}))
```

**Step 3: 简化 `handleDeleteBeta`**

替换 line 210-218 的两个状态更新为：

```typescript
// 更新本地状态
updateRouteAndSelected(selectedRoute.id, r => ({
  ...r,
  betaLinks: (r.betaLinks || []).filter(b => b.id !== betaId),
}))
```

**Step 4: 验证**

Run: `npm run lint && npx tsc --noEmit`
Expected: 无错误

**Step 5: Commit**

```bash
git add src/app/\[locale\]/editor/betas/page.tsx
git commit -m "refactor(editor): consolidate duplicate route state updates in beta handlers

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: 乐观更新替代全量 re-fetch

**Context:** 当前添加 beta 后，`handleBetaSubmitSuccess` 重新 GET 整个 `/api/crags/{id}/routes` 来获取新 beta。但 POST `/api/beta` 的响应已经包含 `{ success: true, beta: newBeta }`。应该让 BetaSubmitDrawer 传回创建的 beta 对象，直接本地追加。

**Files:**
- Modify: `src/components/beta-submit-drawer.tsx:16,131-140`
- Modify: `src/app/[locale]/editor/betas/page.tsx:228-245`
- Modify: `src/components/route-detail-drawer.tsx:519`
- Verify: `src/components/beta-submit-drawer.test.tsx`

**Step 1: 修改 `BetaSubmitDrawer` 接口和实现**

在 `src/components/beta-submit-drawer.tsx`:

1. 添加 import: `import type { BetaLink } from '@/types'`
2. 修改接口 (line 16): `onSuccess?: () => void` → `onSuccess?: (beta: BetaLink) => void`
3. 修改 `handleSubmit` 成功路径 (line 131-140):

替换前:
```typescript
      setSuccess(true)
      // 提交成功后缓存昵称和身体数据
      if (nickname.trim()) localStorage.setItem('beta_nickname', nickname.trim())
      updateBodyData({ height, reach })
      setTimeout(() => {
        handleClose()
        onSuccess?.()
      }, 1500)
```

替换后:
```typescript
      const data = await response.json()
      setSuccess(true)
      // 提交成功后缓存昵称和身体数据
      if (nickname.trim()) localStorage.setItem('beta_nickname', nickname.trim())
      updateBodyData({ height, reach })
      const createdBeta = data.beta as BetaLink
      setTimeout(() => {
        handleClose()
        onSuccess?.(createdBeta)
      }, 1500)
```

**Step 2: 适配 `route-detail-drawer.tsx` 消费者**

line 519 改为:
```typescript
onSuccess={(_beta) => fetchLatestBetas(true)}
```

（接受 `BetaLink` 参数但不使用，保持原有的 re-fetch 行为 — 该组件有自己的 beta 获取逻辑，不需要乐观更新）

**Step 3: 修改 `betas/page.tsx` 的 `handleBetaSubmitSuccess`**

替换 line 228-245:

替换前:
```typescript
const handleBetaSubmitSuccess = useCallback(() => {
  // 重新加载线路数据以获取新 beta
  if (!selectedCragId) return
  fetch(`/api/crags/${selectedCragId}/routes`)
    .then(res => res.json())
    .then(data => {
      if (data.routes) {
        setRoutes(data.routes)
        if (selectedRoute) {
          const updated = (data.routes as Route[]).find(r => r.id === selectedRoute.id)
          if (updated) setSelectedRoute(updated)
        }
      }
    })
    .catch(() => {})
}, [selectedCragId, selectedRoute, setRoutes])
```

替换后:
```typescript
const handleBetaSubmitSuccess = useCallback((newBeta: BetaLink) => {
  if (!selectedRoute) return
  updateRouteAndSelected(selectedRoute.id, r => ({
    ...r,
    betaLinks: [...(r.betaLinks || []), newBeta],
  }))
}, [selectedRoute, updateRouteAndSelected])
```

**Step 4: 检查并更新测试**

读取 `src/components/beta-submit-drawer.test.tsx`，确认 mock fetch response 是否包含 `beta` 字段。如果测试 mock 的 response 不含 `beta`，需要更新：

```typescript
// mock 中的成功响应应为:
{ success: true, beta: { id: 'test-id', platform: 'xiaohongshu', noteId: 'note123', url: 'https://...' } }
```

如果 `onSuccess` 的调用断言存在，更新为:
```typescript
expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 'test-id' }))
```

**Step 5: 验证**

Run: `npm run lint && npx tsc --noEmit && npm run test:run`
Expected: 无错误，所有测试通过

**Step 6: Commit**

```bash
git add src/components/beta-submit-drawer.tsx src/components/route-detail-drawer.tsx src/app/\[locale\]/editor/betas/page.tsx src/components/beta-submit-drawer.test.tsx
git commit -m "fix(editor): use optimistic update instead of full re-fetch after beta submit

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification Checklist

完成所有 Task 后的最终验证：

1. **Lint**: `npm run lint` — 无错误
2. **TypeScript**: `npx tsc --noEmit` — 无类型错误
3. **Tests**: `npm run test:run` — 所有测试通过
4. **手动验证** (`npm run dev`):
   - [ ] 三个 editor 页面（betas, faces, routes）在桌面端正常全宽显示
   - [ ] 三个页面在移动端正常列表/详情切换
   - [ ] Beta 页面：选择线路 → 编辑 beta 元数据 → 保存成功
   - [ ] Beta 页面：删除 beta → 确认 → 删除成功
   - [ ] Beta 页面：添加 beta → 提交成功 → 新 beta 立即出现在列表中（无页面刷新）
   - [ ] 线路详情抽屉中的 Beta 提交也正常工作
