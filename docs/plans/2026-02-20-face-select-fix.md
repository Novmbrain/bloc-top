# Face Selection Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 `handleFaceSelect` 的三个问题：切换岩面时标注数据消失、保存后 DB 数据永久丢失、faceId 即时保存与其他字段行为不一致。

**Architecture:** 修改 `use-route-editor.ts` 的 `handleFaceSelect`（去掉 `setTopoLine([])` 和 auto-PATCH）并更新 `hasUnsavedChanges`（加入 faceId 比较）。函数签名不变，调用方（`FaceSelector`、`InlineFaceUpload`）无需修改。

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library (`renderHook`, `act`)

---

## 背景知识

阅读以下文件再开始：
- **设计文档**: `docs/plans/2026-02-20-face-select-fix-design.md`
- **目标文件**: `apps/editor/src/hooks/use-route-editor.ts`
- **现有测试**: `apps/editor/src/hooks/use-route-editor.test.ts`

测试命令：`pnpm --filter @bloctop/editor test:run`

---

## Task 1: 为新行为写失败测试（TDD）

**Files:**
- Modify: `apps/editor/src/hooks/use-route-editor.test.ts`

### Step 1: 在 `use-route-editor.test.ts` 末尾追加两个测试

在 `describe('useRouteEditor', () => {` 的最后一个 `it(...)` 之后，在最终 `})` 之前追加：

```typescript
  it('切换岩面时 topoLine 不被清空', () => {
    const { result } = setup()
    // 初始化后 topoLine 应有 2 个点
    expect(result.current.topoLine).toHaveLength(2)
    act(() => {
      result.current.handleFaceSelect('face-2', '主墙')
    })
    // 切换 face 后 topoLine 应保留
    expect(result.current.topoLine).toHaveLength(2)
    expect(result.current.selectedFaceId).toBe('face-2')
  })

  it('切换岩面后 hasUnsavedChanges 返回 true', () => {
    const { result } = setup()
    // mockRoute.faceId 为 'face-1'，切换到 'face-2' 应标记为 dirty
    expect(result.current.hasUnsavedChanges()).toBe(false)
    act(() => {
      result.current.handleFaceSelect('face-2', '主墙')
    })
    expect(result.current.hasUnsavedChanges()).toBe(true)
  })
```

### Step 2: 运行测试，确认这两个测试失败

```bash
pnpm --filter @bloctop/editor test:run
```

预期输出（关键行）：
```
✗ 切换岩面时 topoLine 不被清空
✗ 切换岩面后 hasUnsavedChanges 返回 true
```

### Step 3: 提交失败的测试

```bash
git add apps/editor/src/hooks/use-route-editor.test.ts
git commit -m "test(route-editor): add failing tests for face select behavior fix"
```

---

## Task 2: 实现修复

**Files:**
- Modify: `apps/editor/src/hooks/use-route-editor.ts`

### Step 1: 更新 `hasUnsavedChanges`

找到：
```typescript
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!selectedRoute) return false
    const fields = ['name', 'grade', 'area', 'FA', 'setter', 'description'] as const
```

替换为：
```typescript
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!selectedRoute) return false
    if ((selectedFaceId ?? null) !== (selectedRoute.faceId ?? null)) return true
    const fields = ['name', 'grade', 'area', 'FA', 'setter', 'description'] as const
```

找到 `hasUnsavedChanges` 的 deps 数组：
```typescript
  }, [selectedRoute, editedRoute, topoLine, topoTension])
```

替换为：
```typescript
  }, [selectedRoute, editedRoute, topoLine, topoTension, selectedFaceId])
```

### Step 2: 替换 `handleFaceSelect` 整个函数体

找到整个函数（从 `// Face selection` 注释到 `}, [selectedRoute, selectedFaceId, faceImageCache, setRoutes])`）：

```typescript
  // Face selection
  const handleFaceSelect = useCallback(async (faceId: string, area: string) => {
    if (!selectedRoute || faceId === selectedFaceId) return
    setSelectedFaceId(faceId)
    setTopoLine([])
    const url = faceImageCache.getImageUrl({ cragId: selectedRoute.cragId, area, faceId })
    setImageUrl(url)
    setIsImageLoading(true)
    setImageLoadError(false)
    setImageAspectRatio(undefined)
    try {
      const res = await fetch(`/api/routes/${selectedRoute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceId }),
      })
      if (res.ok) {
        const data = await res.json()
        setRoutes(prev => prev.map(r => r.id === selectedRoute.id ? data.route : r))
      }
    } catch { /* 静默失败，保存时会再次绑定 */ }
  }, [selectedRoute, selectedFaceId, faceImageCache, setRoutes])
```

替换为：
```typescript
  // Face selection — 纯 UI 状态更新，不立即 PATCH，等用户点 Save 时统一提交
  const handleFaceSelect = useCallback((faceId: string, area: string) => {
    if (!selectedRoute || faceId === selectedFaceId) return
    setSelectedFaceId(faceId)
    const url = faceImageCache.getImageUrl({ cragId: selectedRoute.cragId, area, faceId })
    setImageUrl(url)
    setIsImageLoading(true)
    setImageLoadError(false)
    setImageAspectRatio(undefined)
  }, [selectedRoute, selectedFaceId, faceImageCache])
```

注意：同时去掉了 `async` 关键字，去掉了 `setRoutes` 依赖。

### Step 3: 运行测试，确认全部通过

```bash
pnpm --filter @bloctop/editor test:run
```

预期：
```
✓ apps/editor/src/hooks/use-route-editor.test.ts (N)
  ✓ 切换岩面时 topoLine 不被清空
  ✓ 切换岩面后 hasUnsavedChanges 返回 true
  ✓ 所有已有测试仍通过
```

### Step 4: 确认类型检查通过

```bash
pnpm --filter @bloctop/editor typecheck 2>&1 | head -20
```

预期：无新增错误。

### Step 5: 提交实现

```bash
git add apps/editor/src/hooks/use-route-editor.ts
git commit -m "fix(route-editor): preserve topoLine and use lazy face save on face select"
```

---

## Task 3: 最终验证

### Step 1: 全量测试

```bash
pnpm --filter @bloctop/editor test:run
```

预期：全部通过（含所有已有测试）。

### Step 2: 类型检查

```bash
pnpm turbo typecheck 2>&1 | tail -5
```

预期：无错误。

### Step 3: ESLint

```bash
pnpm --filter @bloctop/editor lint 2>&1 | tail -10
```

预期：无错误。

### Step 4: 手动验证清单

在开发服务器 `pnpm --filter @bloctop/editor dev` 启动后：

- [ ] 选中一条有 topoLine 的线路 → 切换到不同岩面 → **标注线条仍然可见**
- [ ] 切换岩面后，脏状态提示出现（保存按钮可点击 / 切换路线时弹出确认框）
- [ ] 切换岩面后点"保存" → 保存成功，topoLine 数据保留在 DB
- [ ] 切换岩面后选择"丢弃" → face 恢复为原始值，topoLine 不变
- [ ] 无 topoLine 的线路切换岩面 → 正常（无异常）
- [ ] `InlineFaceUpload` 上传成功后调用 handleFaceSelect → 正常工作

### Step 5: 完成提交（如有收尾修改）

```bash
git add -p
git commit -m "chore(route-editor): final cleanup after face select fix"
```
