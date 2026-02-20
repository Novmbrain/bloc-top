# Face Selection Fix — 设计文档

**日期**: 2026-02-20
**范围**: `apps/editor/src/hooks/use-route-editor.ts`
**问题**: 切换岩面照片时 topoLine 标注数据消失，且存在永久数据丢失风险

---

## 问题分析

### Bug 1：切换岩面时立即清空标注

`handleFaceSelect` 第 218 行：

```typescript
setTopoLine([])  // ← 立即清空，UI 标注消失
```

用户切换岩面照片（如想查看另一张照片）时，已画好的 Topo 线条立即从屏幕消失。

### Bug 2：保存时永久删除 DB 数据

`handleSave` 第 160 行：

```typescript
topoLine: topoLine.length >= 2 ? topoLine : null,
```

切换 face → `topoLine = []` → 点保存 → 发送 `{ topoLine: null }` → **DB 里的标注数据被永久删除**。

### Bug 3：faceId 即时保存，与其他字段不一致

`handleFaceSelect` 第 225-234 行包含一个 PATCH 请求，每次切换岩面都立即保存 faceId 到 DB。而 `name / grade / area / setter / FA / description` 等字段都要等用户点 Save 才保存。这个不一致还导致：

- `hasUnsavedChanges()` 不比较 `selectedFaceId` vs `selectedRoute.faceId`
- 如果只切换了 face（没有改 topoLine），dirty guard 不会感知到这个变更，用户可能在不知情的情况下导航离开

---

## 根本原因

`selectedFaceId` 作为独立状态管理，游离于 `editedRoute`（表单数据）之外，导致：
1. 保存逻辑知道它（`faceId: selectedFaceId`），但 dirty check 不知道它
2. 切换时没有保护措施（直接清空 topoLine）

---

## 设计方案：让 faceId 与其他字段行为一致

### 原则

> Face 选择是表单编辑的一部分，不应"即时保存"，应等用户点 Save 时与其他字段一并提交。

### 变更 1：去掉 `setTopoLine([])`

切换岩面时保留当前 topoLine。坐标为归一化 0-1，在任何照片上均可显示。用户可通过"清除点"按钮手动清空。

```typescript
// Before
const handleFaceSelect = useCallback(async (faceId: string, area: string) => {
  if (!selectedRoute || faceId === selectedFaceId) return
  setSelectedFaceId(faceId)
  setTopoLine([])          // ← 删除
  ...

// After
const handleFaceSelect = useCallback((faceId: string, area: string) => {
  if (!selectedRoute || faceId === selectedFaceId) return
  setSelectedFaceId(faceId)
  // topoLine 保留，不清空
  ...
```

### 变更 2：去掉 auto-PATCH

`handleFaceSelect` 变成纯 UI 状态更新，不再发送 API 请求：

```typescript
// Before：切换岩面 → 立即 PATCH faceId → setRoutes 更新
// After：切换岩面 → 只更新 selectedFaceId + imageUrl

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

函数签名不变（`(faceId: string, area: string) => void`），所有调用方无需修改。

### 变更 3：hasUnsavedChanges 加入 faceId 比较

```typescript
const hasUnsavedChanges = useCallback((): boolean => {
  if (!selectedRoute) return false
  // 新增：faceId 变更也算 dirty
  if ((selectedFaceId ?? null) !== (selectedRoute.faceId ?? null)) return true
  const fields = ['name', 'grade', 'area', 'FA', 'setter', 'description'] as const
  ...
}, [selectedRoute, editedRoute, topoLine, topoTension, selectedFaceId])
// ↑ 注意：deps 加入 selectedFaceId
```

---

## 影响范围

| 场景 | Before | After |
|------|--------|-------|
| 切换岩面，topoLine 存在 | 标注消失 | 标注保留（显示在新照片上） |
| 切换岩面后点 Save | 标注数据永久丢失 | 标注数据保存到新 face |
| 切换岩面后导航离开（未 Save） | faceId 已保存到 DB，topoLine 不一致 | dirty guard 提示保存，保证一致性 |
| 只切换岩面（未改其他）后导航离开 | dirty guard 不触发，face 变更静默保存 | dirty guard 触发，提示用户 |
| InlineFaceUpload 上传成功后调用 handleFaceSelect | 正常（新 face，无旧 topoLine） | 正常（行为不变） |

---

## 不变的部分

- `handleSave` 发送 `faceId: selectedFaceId` —— 已正确
- `handleFaceSelect` 函数签名 `(faceId: string, area: string)` —— 不变，调用方无需修改
- FaceSelector 的 `onSelect={editor.handleFaceSelect}` —— 不变
- InlineFaceUpload 的 `editor.handleFaceSelect(newFaceId, selectedRoute.area)` —— 不变

---

## 测试策略

**新增单元测试** (`use-route-editor.test.ts` 或 `tab-logic.test.ts`):

1. `handleFaceSelect` 切换 face 后 topoLine 不变
2. `hasUnsavedChanges` 在 faceId 变更时返回 true
3. `hasUnsavedChanges` 在 faceId 未变更时不受影响

---

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `apps/editor/src/hooks/use-route-editor.ts` | 去掉 `setTopoLine([])`，去掉 auto-PATCH，`hasUnsavedChanges` 加入 faceId 比较，deps 修正 |
| `apps/editor/src/hooks/use-route-editor.test.ts` | 新建测试文件（或更新已有） |
