# Routes + Betas 合并 Phase 1 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在线路标注页（routes/page.tsx）的右栏线路编辑面板顶部加入 Tab 切换器，将"Topo 标注"和"Beta 视频"整合到同一页面，消除用户在 Routes 和 Betas 两个模块间反复导航的需求。

**Architecture:** 在现有 `rightPanel` 的路线编辑面板分支中插入 `activeTab` 状态 + Tab 栏 UI，条件渲染两套内容。Beta Tab 完全复用已有的 `useBetaManagement` hook、`BetaCard` 和 `BetaSubmitDrawer` 组件，不重写任何业务逻辑。

**Tech Stack:** React 18, Next.js App Router, TypeScript, Vitest + Testing Library, Tailwind CSS v4 + CSS变量主题系统

---

## 背景知识

阅读本计划前需了解的文件：

- **设计文档**: `docs/plans/2026-02-19-routes-betas-merge-design.md`
- **目标文件**: `apps/editor/src/app/routes/page.tsx`（约 800 行）
- **复用 hook**: `apps/editor/src/hooks/use-beta-management.ts`
- **复用组件**: `apps/editor/src/components/editor/beta-card.tsx`
- **复用组件**: `apps/editor/src/components/beta-submit-drawer.tsx`

关键的代码路径：`handleRouteClick` → `dirtyGuard.guardAction({ type: 'switchRoute' })` → `executePendingAction`（第 105-127 行）→ `setSelectedRoute`。**`activeTab` 重置必须在 `executePendingAction` 的 `switchRoute` case 里，不能在 `handleRouteClick` 里**，否则用户点击"取消"放弃切换时 Tab 已经错误重置。

测试命令：`pnpm --filter @bloctop/editor test:run`

---

## Task 1: 添加 `activeTab` 状态并在路线切换时重置

**Files:**
- Modify: `apps/editor/src/app/routes/page.tsx:66-73`（状态声明区块）
- Modify: `apps/editor/src/app/routes/page.tsx:105-127`（`executePendingAction`）

这一步不涉及任何 UI 变化，只是正确地管理状态生命周期。

**Step 1: 在状态声明区块（第 66-73 行附近）增加 `activeTab`**

找到这段代码：
```typescript
  // ============ 导航状态 ============
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [showEditorPanel, setShowEditorPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'marked' | 'unmarked'>('all')
```

替换为：
```typescript
  // ============ 导航状态 ============
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [showEditorPanel, setShowEditorPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'marked' | 'unmarked'>('all')
  const [activeTab, setActiveTab] = useState<'topo' | 'beta'>('topo')
```

**Step 2: 在 `executePendingAction` 的 `switchRoute` case 里重置 Tab**

找到：
```typescript
  const executePendingAction = useCallback((action: PendingAction) => {
    switch (action.type) {
      case 'switchRoute':
        setSelectedRoute(action.payload)
        break
```

替换为：
```typescript
  const executePendingAction = useCallback((action: PendingAction) => {
    switch (action.type) {
      case 'switchRoute':
        setSelectedRoute(action.payload)
        setActiveTab('topo')
        break
```

注意：`setActiveTab` 不需要加入 `useCallback` 的 deps 数组（它是稳定的 setState setter）。

**Step 3: 确认文件可以编译**

```bash
pnpm --filter @bloctop/editor typecheck 2>&1 | head -20
```

预期：无错误输出（或者只有与本次修改无关的已有错误）。

**Step 4: Commit**

```bash
git add apps/editor/src/app/routes/page.tsx
git commit -m "feat(routes): add activeTab state for Topo/Beta tab switching"
```

---

## Task 2: 新增 import 和 Beta 相关 hook/状态

**Files:**
- Modify: `apps/editor/src/app/routes/page.tsx:1-46`（import 区域）
- Modify: `apps/editor/src/app/routes/page.tsx:58-103`（状态/hook 声明）

**Step 1: 在 import 区域追加三行**

找到已有的：
```typescript
import { useDirtyGuard } from '@/hooks/use-dirty-guard'
import type { R2FaceInfo, FaceGroup } from '@/types/face'
```

在其后追加：
```typescript
import { useBetaManagement } from '@/hooks/use-beta-management'
import { BetaCard } from '@/components/editor/beta-card'
import { BetaSubmitDrawer } from '@/components/beta-submit-drawer'
import type { BetaLink } from '@bloctop/shared/types'
import { Play } from 'lucide-react'
```

**Step 2: 在 hook 区块（`useRouteEditor` 之后）插入 useBetaManagement**

找到：
```typescript
  const creation = useRouteCreation({
```

在其前面插入：
```typescript
  // ============ Beta 管理 ============
  const {
    editingBetaId, setEditingBetaId,
    editForm, setEditForm,
    isSaving: isBetaSaving, deletingBetaId,
    handleStartEdit: handleStartBetaEdit,
    handleSaveBeta,
    handleDeleteBeta,
  } = useBetaManagement({ setRoutes })

  const [showBetaSubmitDrawer, setShowBetaSubmitDrawer] = useState(false)

  const handleBetaSubmitSuccess = useCallback((newBeta: BetaLink) => {
    if (!selectedRoute) return
    setRoutes(prev => prev.map(r =>
      r.id === selectedRoute.id
        ? { ...r, betaLinks: [...(r.betaLinks || []), newBeta] }
        : r
    ))
    setSelectedRoute(prev => prev && prev.id === selectedRoute.id
      ? { ...prev, betaLinks: [...(prev.betaLinks || []), newBeta] }
      : prev
    )
  }, [selectedRoute, setRoutes])

```

**Step 3: 确认编译**

```bash
pnpm --filter @bloctop/editor typecheck 2>&1 | head -20
```

预期：无新增错误。

**Step 4: Commit**

```bash
git add apps/editor/src/app/routes/page.tsx
git commit -m "feat(routes): import and wire useBetaManagement hook"
```

---

## Task 3: 在右栏线路编辑面板插入 Tab 栏 + Beta 内容

这是改动最集中的任务：在 `rightPanel` const 的路线编辑面板分支中插入 Tab UI 和 Beta 内容。

**Files:**
- Modify: `apps/editor/src/app/routes/page.tsx:536-700`（rightPanel 路线编辑分支）

**Step 1: 找到路线标题 header 结束位置（第 560 行附近）**

找到路线标题 div 的结尾（`</div>` 之后就是岩面选择器 `{/* 岩面选择器 */}`）：
```tsx
          </div>

          {/* 岩面选择器 */}
          <div className="glass-light p-4" ...>
```

**Step 2: 在路线标题 div 和岩面选择器之间插入 Tab 栏**

```tsx
          </div>

          {/* Tab 切换栏 */}
          <div className="flex glass-light rounded-xl p-1 gap-1">
            {(['topo', 'beta'] as const).map(tab => {
              const label = tab === 'topo'
                ? 'Topo 标注'
                : `Beta 视频${selectedRoute.betaLinks?.length ? ` (${selectedRoute.betaLinks.length})` : ''}`
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98]"
                  style={{
                    backgroundColor: activeTab === tab ? 'var(--theme-primary)' : undefined,
                    color: activeTab === tab ? 'var(--theme-on-primary)' : 'var(--theme-on-surface-variant)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* 岩面选择器 */}
```

**Step 3: 将 Topo Tab 的所有内容包裹在 `{activeTab === 'topo' && (...)}`**

找到：
```tsx
          {/* 岩面选择器 */}
          <div className="glass-light p-4" ...>
```

一直到线路信息编辑表单和保存/删除按钮（第 698 行的 `</div>`）之前，将整段包进：
```tsx
          {activeTab === 'topo' && (
            <>
              {/* 岩面选择器 */}
              ...（现有所有内容）...
              {/* 保存/删除按钮 */}
              ...
            </>
          )}
```

注意：保存/删除按钮区块（`editor.isDirty || editor.showDeleteConfirm` 相关的那个 div）也在 Topo Tab 里，一起包进去。

**Step 4: 在 Topo Tab 块之后追加 Beta Tab 内容**

```tsx
          {activeTab === 'beta' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
                  Beta 视频 ({selectedRoute.betaLinks?.length || 0})
                </h3>
                <button
                  onClick={() => setShowBetaSubmitDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-on-primary)',
                  }}
                >
                  <Plus className="w-4 h-4" />
                  添加 Beta
                </button>
              </div>

              {(!selectedRoute.betaLinks || selectedRoute.betaLinks.length === 0) ? (
                <div
                  className="text-center py-8 glass-light"
                  style={{
                    borderRadius: 'var(--theme-radius-xl)',
                    color: 'var(--theme-on-surface-variant)',
                  }}
                >
                  <Play className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无 Beta 视频</p>
                  <button
                    onClick={() => setShowBetaSubmitDrawer(true)}
                    className="text-sm font-medium mt-2 inline-block"
                    style={{ color: 'var(--theme-primary)' }}
                  >
                    添加第一个 Beta →
                  </button>
                </div>
              ) : (
                selectedRoute.betaLinks.map((beta) => (
                  <BetaCard
                    key={beta.id}
                    beta={beta}
                    isEditing={editingBetaId === beta.id}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onStartEdit={() => handleStartBetaEdit(beta)}
                    onCancelEdit={() => setEditingBetaId(null)}
                    onSave={() => handleSaveBeta(beta.id, selectedRoute, setSelectedRoute)}
                    onDelete={() => handleDeleteBeta(beta.id, selectedRoute, setSelectedRoute)}
                    isSaving={isBetaSaving}
                    isDeleting={deletingBetaId === beta.id}
                  />
                ))
              )}
            </div>
          )}
```

**Step 5: 在文件末尾（ConfirmDialog 之后）追加 BetaSubmitDrawer**

找到文件最后的 `</div>` 结束标签之前（包含所有 Dialog 的区域），追加：

```tsx
      {/* Beta 提交抽屉 */}
      {selectedRoute && (
        <BetaSubmitDrawer
          isOpen={showBetaSubmitDrawer}
          onClose={() => setShowBetaSubmitDrawer(false)}
          routeId={selectedRoute.id}
          routeName={selectedRoute.name}
          onSuccess={handleBetaSubmitSuccess}
        />
      )}
```

**Step 6: 确认编译**

```bash
pnpm --filter @bloctop/editor typecheck 2>&1 | head -30
```

预期：无新增类型错误。

**Step 7: Commit**

```bash
git add apps/editor/src/app/routes/page.tsx
git commit -m "feat(routes): add Topo/Beta tab switcher in route edit panel"
```

---

## Task 4: 为 Tab 行为写测试

测试应放在 `apps/editor/src/app/routes/` 目录下，但由于 `routes/page.tsx` 是一个复杂的页面组件（需要大量 mock），测试应针对 **纯逻辑单元**：Tab 状态管理和 `betaLinks` 计数，用 pure function 测试，不 render 整个页面。

**Files:**
- Create: `apps/editor/src/app/routes/tab-logic.test.ts`

**Step 1: 写测试**

```typescript
// apps/editor/src/app/routes/tab-logic.test.ts
import { describe, it, expect } from 'vitest'

// 纯函数：从 betaLinks 推导 Tab 标签文字
function getBetaTabLabel(betaLinks: { id: string }[] | undefined): string {
  const count = betaLinks?.length
  return count ? `Beta 视频 (${count})` : 'Beta 视频'
}

describe('getBetaTabLabel', () => {
  it('无 betaLinks 时显示"Beta 视频"', () => {
    expect(getBetaTabLabel(undefined)).toBe('Beta 视频')
  })

  it('空数组时显示"Beta 视频"', () => {
    expect(getBetaTabLabel([])).toBe('Beta 视频')
  })

  it('有 1 个 beta 时显示计数', () => {
    expect(getBetaTabLabel([{ id: 'b1' }])).toBe('Beta 视频 (1)')
  })

  it('有 3 个 beta 时显示计数', () => {
    expect(getBetaTabLabel([{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }])).toBe('Beta 视频 (3)')
  })
})

// 纯函数：executePendingAction 中 switchRoute 应重置 tab
describe('activeTab reset on route switch', () => {
  it('switchRoute action 应将 activeTab 重置为 topo', () => {
    // 模拟 executePendingAction 的核心逻辑
    let activeTab: 'topo' | 'beta' = 'beta'  // 模拟用户在 beta tab
    const simulateSwitch = () => { activeTab = 'topo' }

    simulateSwitch()
    expect(activeTab).toBe('topo')
  })
})
```

**Step 2: 运行测试，确认通过**

```bash
pnpm --filter @bloctop/editor test:run
```

预期输出（关键行）：
```
✓ apps/editor/src/app/routes/tab-logic.test.ts (5)
```

**Step 3: Commit**

```bash
git add apps/editor/src/app/routes/tab-logic.test.ts
git commit -m "test(routes): add tab label and tab reset unit tests"
```

---

## Task 5: Phase 2 — 新建 `InlineFaceUpload` 组件

当 `areaFaceGroups.length === 0`（当前区域还没有任何岩面照片）时，Topo Tab 显示内嵌上传入口，而不是空的 FaceSelector + 占位 TopoPreview。

**Files:**
- Create: `apps/editor/src/components/editor/inline-face-upload.tsx`
- Create: `apps/editor/src/components/editor/inline-face-upload.test.tsx`

**注意事项**:
- 复用 `ImageUploadZone`（`apps/editor/src/components/editor/image-upload-zone.tsx`）
- faceId 格式要求：小写英文字母 + 连字符，如 `zhu-qiang`（使用 `/^[a-z][a-z0-9-]*[a-z0-9]$/` 验证）
- 区域 `area` 从 `selectedRoute.area` 传入，只读显示
- 上传调用 `/api/faces`（POST），与 `faces/page.tsx` 中的 `doUpload` 逻辑相同

**Step 1: 写组件测试（先写测试）**

```typescript
// apps/editor/src/components/editor/inline-face-upload.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InlineFaceUpload } from './inline-face-upload'

// 简单 mock ImageUploadZone（避免文件上传的复杂 mock）
vi.mock('./image-upload-zone', () => ({
  ImageUploadZone: ({ onFileSelect }: { onFileSelect: (f: File) => void }) => (
    <button
      data-testid="upload-zone"
      onClick={() => onFileSelect(new File(['img'], 'test.jpg', { type: 'image/jpeg' }))}
    >
      上传区
    </button>
  ),
}))

describe('InlineFaceUpload', () => {
  it('显示区域只读 badge', () => {
    render(
      <InlineFaceUpload cragId="test-crag" area="主墙" onUploadSuccess={vi.fn()} />
    )
    expect(screen.getByText('主墙')).toBeInTheDocument()
  })

  it('faceId 为空时按钮 disabled', () => {
    render(
      <InlineFaceUpload cragId="test-crag" area="主墙" onUploadSuccess={vi.fn()} />
    )
    const btn = screen.getByRole('button', { name: /上传并开始标注/ })
    expect(btn).toBeDisabled()
  })

  it('faceId 格式非法时提示错误', () => {
    render(
      <InlineFaceUpload cragId="test-crag" area="主墙" onUploadSuccess={vi.fn()} />
    )
    // 填入非法 faceId（含大写字母）
    const input = screen.getByPlaceholderText(/如.*zhu-qiang/)
    fireEvent.change(input, { target: { value: 'ZhuQiang' } })
    expect(screen.getByText(/只能包含小写字母/)).toBeInTheDocument()
  })
})
```

**Step 2: 运行测试，确认失败（测试驱动）**

```bash
pnpm --filter @bloctop/editor test:run
```

预期：3 个测试失败（组件不存在）

**Step 3: 实现 `InlineFaceUpload` 组件**

```tsx
// apps/editor/src/components/editor/inline-face-upload.tsx
'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Input } from '@bloctop/ui/components/input'
import { useToast } from '@bloctop/ui/components/toast'
import { ImageUploadZone } from './image-upload-zone'

const FACE_ID_REGEX = /^[a-z][a-z0-9-]*[a-z0-9]$/

interface InlineFaceUploadProps {
  cragId: string
  area: string
  onUploadSuccess: (faceId: string) => void
}

export function InlineFaceUpload({ cragId, area, onUploadSuccess }: InlineFaceUploadProps) {
  const [faceId, setFaceId] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [faceIdError, setFaceIdError] = useState('')
  const { showToast } = useToast()

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error')
      return
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [showToast])

  const handleFaceIdChange = useCallback((value: string) => {
    setFaceId(value)
    if (value && !FACE_ID_REGEX.test(value)) {
      setFaceIdError('只能包含小写字母、数字和连字符，且以字母开头结尾')
    } else {
      setFaceIdError('')
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !faceId || faceIdError) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('cragId', cragId)
      formData.append('area', area)
      formData.append('faceId', faceId)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上传失败')

      showToast('岩面照片上传成功', 'success')
      onUploadSuccess(faceId)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '上传失败', 'error')
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, faceId, faceIdError, cragId, area, showToast, onUploadSuccess])

  const isDisabled = !selectedFile || !faceId || !!faceIdError || isUploading

  return (
    <div className="space-y-4">
      <div
        className="glass-light p-4 text-center"
        style={{ borderRadius: 'var(--theme-radius-xl)', color: 'var(--theme-on-surface-variant)' }}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--theme-on-surface)' }}>
          当前区域还没有岩面照片
        </p>
        <p className="text-xs">上传一张照片即可开始标注线路</p>
      </div>

      <ImageUploadZone
        previewUrl={previewUrl}
        onFileSelect={handleFileSelect}
      />

      <div className="space-y-3">
        {/* 区域只读显示 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--theme-on-surface-variant)' }}>区域</span>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
            }}
          >
            {area}
          </span>
        </div>

        {/* faceId 输入 */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
            岩面名称（英文ID）
          </label>
          <Input
            value={faceId}
            onChange={handleFaceIdChange}
            placeholder="如：zhu-qiang"
            style={faceIdError ? { borderColor: 'var(--theme-error)' } : undefined}
          />
          {faceIdError && (
            <p className="text-xs mt-1" style={{ color: 'var(--theme-error)' }} role="alert">
              {faceIdError}
            </p>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={isDisabled}
          className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            opacity: isDisabled ? 0.5 : 1,
          }}
        >
          {isUploading ? (
            <><div className="w-5 h-5 animate-spin"><Loader2 className="w-full h-full" /></div> 上传中...</>
          ) : (
            <><Upload className="w-5 h-5" /> 上传并开始标注</>
          )}
        </button>
      </div>
    </div>
  )
}
```

**Step 4: 运行测试，确认通过**

```bash
pnpm --filter @bloctop/editor test:run
```

预期：
```
✓ apps/editor/src/components/editor/inline-face-upload.test.tsx (3)
```

**Step 5: Commit**

```bash
git add apps/editor/src/components/editor/inline-face-upload.tsx \
        apps/editor/src/components/editor/inline-face-upload.test.tsx
git commit -m "feat(routes): add InlineFaceUpload component for empty face state"
```

---

## Task 6: Phase 2 — 在 routes/page.tsx 集成内嵌上传

**Files:**
- Modify: `apps/editor/src/app/routes/page.tsx`（import + showInlineUpload 逻辑 + JSX 替换）

**Step 1: 追加 import**

在已有的 import 末尾追加：
```typescript
import { InlineFaceUpload } from '@/components/editor/inline-face-upload'
```

**Step 2: 在 `areaFaceGroups` useMemo 之后添加派生值**

找到：
```typescript
  const areaFaceGroups = useMemo(() => ...
```

在其后追加：
```typescript
  const showInlineUpload = !!selectedRoute
    && activeTab === 'topo'
    && !isLoadingFaces
    && areaFaceGroups.length === 0
```

**Step 3: 在 Topo Tab 内替换条件渲染**

在 `{activeTab === 'topo' && (...)}` 块内，将"岩面选择器 + TopoPreview"替换为：

```tsx
          {/* 岩面选择器（有岩面时显示）/ 内嵌上传（无岩面时显示）*/}
          {showInlineUpload ? (
            <InlineFaceUpload
              cragId={selectedCragId!}
              area={selectedRoute.area}
              onUploadSuccess={(newFaceId) => {
                setR2Faces(prev => [...prev, { faceId: newFaceId, area: selectedRoute.area }])
                editor.handleFaceSelect(newFaceId)
                editor.handleOpenFullscreen()
              }}
            />
          ) : (
            <>
              {/* 岩面选择器 */}
              <div className="glass-light p-4" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
                ...（现有 FaceSelector 内容）...
              </div>

              {/* Topo 画布 */}
              <TopoPreview ... />
            </>
          )}
```

**Step 4: 确认编译**

```bash
pnpm --filter @bloctop/editor typecheck 2>&1 | head -20
```

预期：无新增错误。

**Step 5: 运行全部测试**

```bash
pnpm --filter @bloctop/editor test:run
```

预期：全部通过（含之前所有 70+ 个测试）。

**Step 6: Commit**

```bash
git add apps/editor/src/app/routes/page.tsx
git commit -m "feat(routes): integrate InlineFaceUpload for zero-face-count state (Phase 2)"
```

---

## Task 7: 最终验证

**Step 1: 运行全量测试**

```bash
pnpm --filter @bloctop/editor test:run
```

预期：全部通过

**Step 2: 类型检查**

```bash
pnpm turbo typecheck 2>&1 | tail -5
```

预期：无错误

**Step 3: ESLint**

```bash
pnpm --filter @bloctop/editor lint 2>&1 | tail -10
```

预期：无错误

**Step 4: 手动验证清单**

在开发服务器 `pnpm --filter @bloctop/editor dev` 启动后：

- [ ] 选中一条线路，右栏出现 "Topo 标注 | Beta 视频" Tab
- [ ] 切换到 "Beta 视频" Tab，显示 Beta 列表（或空状态）
- [ ] 在 Beta Tab 点击"添加 Beta"，BetaSubmitDrawer 正常弹出
- [ ] 添加成功后 Tab 标签显示计数：`Beta 视频 (1)`
- [ ] 切换到另一条线路，Tab 自动重置回 "Topo 标注"
- [ ] 在有未保存更改时点击另一条线路，出现"保存并切换"确认框，**取消**后仍在当前 Tab
- [ ] 当前区域无岩面时（可新建测试岩场），显示内嵌上传界面
- [ ] faceId 输入非法格式（如含大写）时显示错误提示，按钮禁用

**Step 5: Commit（如有收尾修改）**

```bash
git add -p
git commit -m "chore(routes): final cleanup after Phase 1+2 integration"
```
