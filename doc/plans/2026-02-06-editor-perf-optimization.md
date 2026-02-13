# Editor Performance Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 优化 editor 页面的包体积（~80KB）和运行时性能（消除重复计算、减少不必要的重渲染）

**Architecture:** 两个方向——(1) 将仅在特定操作时用到的重量级库改为动态导入；(2) 修复 useMemo 链中的重复计算、替换昂贵的深比较、预计算渲染期间的 inline 过滤。不涉及 API 变更或组件拆分。

**Tech Stack:** Next.js dynamic imports, React useMemo/useCallback, TypeScript

---

## Task 1: Dynamic import `browser-image-compression` (~50KB 节省)

**Files:**
- Modify: `src/app/[locale]/editor/faces/page.tsx:19` (删除 static import)
- Modify: `src/app/[locale]/editor/faces/page.tsx:260` (doUpload 函数内动态导入)

**Step 1: 删除静态 import**

```diff
- import imageCompression from 'browser-image-compression'
```

**Step 2: 在 doUpload 中动态导入**

将 `doUpload` 回调中的 `imageCompression(...)` 调用改为：

```typescript
if (fileToUpload.size > 5 * 1024 * 1024) {
  setCompressionProgress(0)
  const { default: imageCompression } = await import('browser-image-compression')
  fileToUpload = await imageCompression(fileToUpload, {
    maxSizeMB: 4,
    maxWidthOrHeight: 4096,
    useWebWorker: true,
    onProgress: (p: number) => setCompressionProgress(Math.round(p)),
  })
  setCompressionProgress(null)
}
```

**Step 3: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无新增错误

**Step 4: 验证 lint 通过**

Run: `npx eslint src/app/\[locale\]/editor/faces/page.tsx`
Expected: 无新增错误

**Step 5: Commit**

```bash
git add src/app/\[locale\]/editor/faces/page.tsx
git commit -m "perf(editor): dynamic import browser-image-compression (~50KB)"
```

---

## Task 2: Dynamic import `FullscreenTopoEditor` + `react-zoom-pan-pinch` (~30KB 节省)

**Files:**
- Modify: `src/app/[locale]/editor/routes/page.tsx:36` (改为 next/dynamic)
- Modify: `src/components/editor/fullscreen-topo-editor.tsx:1` (添加 default export)

**Step 1: 添加 default export**

在 `fullscreen-topo-editor.tsx` 文件末尾添加：

```typescript
export default FullscreenTopoEditor
```

**Step 2: 在 routes/page.tsx 中改为 dynamic import**

替换 static import：

```diff
- import { FullscreenTopoEditor } from '@/components/editor/fullscreen-topo-editor'
+ import dynamic from 'next/dynamic'

+ const FullscreenTopoEditor = dynamic(
+   () => import('@/components/editor/fullscreen-topo-editor'),
+   { ssr: false }
+ )
```

注意：`next/dynamic` 默认导入 default export，所以 Step 1 添加了 default export。

**Step 3: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无新增错误

**Step 4: 验证 lint 通过**

Run: `npx eslint src/app/\[locale\]/editor/routes/page.tsx src/components/editor/fullscreen-topo-editor.tsx`
Expected: 无新增错误

**Step 5: Commit**

```bash
git add src/app/\[locale\]/editor/routes/page.tsx src/components/editor/fullscreen-topo-editor.tsx
git commit -m "perf(editor): lazy-load FullscreenTopoEditor + react-zoom-pan-pinch (~30KB)"
```

---

## Task 3: 消除 routes/page.tsx 中 scalePoints 重复计算

**Files:**
- Modify: `src/app/[locale]/editor/routes/page.tsx:529-538`

**Step 1: 让 pathData 依赖 scaledPoints 的 memo**

当前代码：

```typescript
const pathData = useMemo(() => {
  if (topoLine.length < 2) return ''
  const scaled = scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT)
  return bezierCurve(scaled)
}, [topoLine])

const scaledPoints = useMemo(
  () => scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT),
  [topoLine]
)
```

改为（注意：scaledPoints 必须在 pathData 之前声明）：

```typescript
const scaledPoints = useMemo(
  () => scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT),
  [topoLine]
)

const pathData = useMemo(() => {
  if (scaledPoints.length < 2) return ''
  return bezierCurve(scaledPoints)
}, [scaledPoints])
```

**Step 2: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无新增错误

**Step 3: Commit**

```bash
git add src/app/\[locale\]/editor/routes/page.tsx
git commit -m "perf(editor): eliminate duplicate scalePoints in routes editor"
```

---

## Task 4: 消除 fullscreen-topo-editor.tsx 中 scalePoints 重复计算

**Files:**
- Modify: `src/components/editor/fullscreen-topo-editor.tsx:74-83`

**Step 1: 让 fsPathData 依赖 fsScaledPoints**

当前代码：

```typescript
const fsScaledPoints = useMemo(
  () => scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT),
  [topoLine]
)
const fsPathData = useMemo(() => {
  if (topoLine.length < 2) return ''
  const scaled = scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT)
  return bezierCurve(scaled)
}, [topoLine])
```

改为：

```typescript
const fsScaledPoints = useMemo(
  () => scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT),
  [topoLine]
)
const fsPathData = useMemo(() => {
  if (fsScaledPoints.length < 2) return ''
  return bezierCurve(fsScaledPoints)
}, [fsScaledPoints])
```

**Step 2: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无新增错误

**Step 3: Commit**

```bash
git add src/components/editor/fullscreen-topo-editor.tsx
git commit -m "perf(editor): eliminate duplicate scalePoints in fullscreen editor"
```

---

## Task 5: 优化 hasUnsavedChanges 的深比较

**Files:**
- Modify: `src/app/[locale]/editor/routes/page.tsx:122-132`

**Step 1: 替换 JSON.stringify 为逐点比较**

当前代码：

```typescript
const hasUnsavedChanges = useCallback((): boolean => {
  if (!selectedRoute) return false
  const fields = ['name', 'grade', 'area', 'FA', 'setter', 'description'] as const
  for (const field of fields) {
    if ((editedRoute[field] ?? '') !== (selectedRoute[field] ?? '')) return true
  }
  // Deep compare topoLine
  if (JSON.stringify(topoLine) !== JSON.stringify(selectedRoute.topoLine || [])) return true
  return false
}, [selectedRoute, editedRoute, topoLine])
```

改为：

```typescript
const hasUnsavedChanges = useCallback((): boolean => {
  if (!selectedRoute) return false
  const fields = ['name', 'grade', 'area', 'FA', 'setter', 'description'] as const
  for (const field of fields) {
    if ((editedRoute[field] ?? '') !== (selectedRoute[field] ?? '')) return true
  }
  // Point-by-point comparison (faster than JSON.stringify)
  const original = selectedRoute.topoLine || []
  if (topoLine.length !== original.length) return true
  for (let i = 0; i < topoLine.length; i++) {
    if (topoLine[i].x !== original[i].x || topoLine[i].y !== original[i].y) return true
  }
  return false
}, [selectedRoute, editedRoute, topoLine])
```

**Step 2: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无新增错误

**Step 3: Commit**

```bash
git add src/app/\[locale\]/editor/routes/page.tsx
git commit -m "perf(editor): replace JSON.stringify with point-by-point comparison in dirty check"
```

---

## Task 6: 预计算 area 计数 Map，消除 inline filter

**Files:**
- Modify: `src/app/[locale]/editor/routes/page.tsx:574-575` (使用预计算 Map)
- Modify: `src/app/[locale]/editor/routes/page.tsx` (在 areaRoutes 附近新增 memo)

**Step 1: 新增 areaCounts memo**

在 `areaStats` memo（约第 294 行）之后添加：

```typescript
// 预计算每个 area 的线路数量（避免 JSX 中 O(n*m) 的 inline filter）
const areaCounts = useMemo(() => {
  const counts = new Map<string, number>()
  routes.forEach(r => {
    if (r.area) counts.set(r.area, (counts.get(r.area) || 0) + 1)
  })
  return counts
}, [routes])
```

**Step 2: 使用 areaCounts 替换 inline filter**

将左栏 JSX 中的：

```typescript
{areas.map(area => {
  const count = routes.filter(r => r.area === area).length
  return (
    <button ...>
      {area} ({count})
    </button>
  )
})}
```

改为：

```typescript
{areas.map(area => (
  <button
    key={area}
    onClick={() => handleAreaSwitch(area)}
    className="px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 font-medium text-sm"
    style={{
      backgroundColor: selectedArea === area ? 'var(--theme-primary)' : 'var(--theme-surface-variant)',
      color: selectedArea === area ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)',
    }}
  >
    {area} ({areaCounts.get(area) || 0})
  </button>
))}
```

**Step 3: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无新增错误

**Step 4: Commit**

```bash
git add src/app/\[locale\]/editor/routes/page.tsx
git commit -m "perf(editor): pre-compute area counts as Map, eliminate inline O(n*m) filter"
```

---

## Task 7: Memoize RouteCard 计算

**Files:**
- Modify: `src/components/editor/route-card.tsx:17-18`

**Step 1: 添加 useMemo 导入并 memo 化计算**

在 import 行添加 `useMemo`：

```diff
+ import { useMemo } from 'react'
  import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
```

替换：

```typescript
const hasTopo = route.topoLine && route.topoLine.length >= 2
const gradeColor = getGradeColor(route.grade)
```

为：

```typescript
const hasTopo = useMemo(
  () => route.topoLine && route.topoLine.length >= 2,
  [route.topoLine]
)
const gradeColor = useMemo(
  () => getGradeColor(route.grade),
  [route.grade]
)
```

**Step 2: 验证编译通过**

Run: `npx tsc --noEmit`
Expected: 无新增错误

**Step 3: Commit**

```bash
git add src/components/editor/route-card.tsx
git commit -m "perf(editor): memoize RouteCard hasTopo and gradeColor"
```

---

## Task 8: 最终验证

**Step 1: 运行完整 lint + 类型检查**

Run: `npx eslint src/ && npx tsc --noEmit`
Expected: 无新增错误

**Step 2: 运行全部测试**

Run: `npm run test:run`
Expected: 全部通过

**Step 3: 确认 dev 服务器正常启动**

Run: `npm run dev` → 手动访问 editor 页面确认功能正常

---

## 预期收益

| 优化 | 类型 | 预估收益 |
|------|------|---------|
| Task 1 | Bundle | ~50KB 首屏节省 |
| Task 2 | Bundle | ~30KB 首屏节省 |
| Task 3+4 | Compute | 每次 topoLine 变更少一次 scalePoints 调用 |
| Task 5 | Compute | hasUnsavedChanges 从 O(n) JSON 序列化降为 O(n) 数值比较 |
| Task 6 | Compute | 区域按钮渲染从 O(areas × routes) 降为 O(1) Map 查找 |
| Task 7 | Re-render | 列表中 50+ RouteCard 减少不必要重计算 |
