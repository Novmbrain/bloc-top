# 线路多图标注（Multi-Topo Annotations）实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让一条线路可以关联多个（faceId + topoLine）标注对，Editor 同页面切换编辑，PWA 端轮播展示。

**Architecture:** 新增 `Route.topoAnnotations?: RouteTopoAnnotation[]` 字段（嵌入 MongoDB document），兼容层 `getTopoAnnotations()` 统一读取新旧数据，Editor hook 重构为 annotations 数组状态，PWA 用 CSS scroll-snap 原生轮播。旧字段 `faceId`/`topoLine` 保留作 fallback，写入时 compat sync 同步第一条标注到旧字段。

**Tech Stack:** TypeScript, React, Vitest + Testing Library, Next.js App Router, MongoDB（通过现有 `updateRoute()` 函数）

---

## Task 1：类型层 — 添加 RouteTopoAnnotation 和 Route.topoAnnotations

**Files:**
- Modify: `packages/shared/src/types/index.ts`（在 `TopoPoint` 接口之后，Route 接口之前）

无需测试（纯类型定义）。

**Step 1: 添加 RouteTopoAnnotation 接口**

在 `packages/shared/src/types/index.ts` 的第 55 行（`TopoPoint` 接口之后、`Route` 接口之前）插入：

```typescript
// 单张图的 topo 标注数据（多图标注功能用）
export interface RouteTopoAnnotation {
  faceId: string
  area: string
  topoLine: TopoPoint[]     // 有效值：至少 2 个点
  topoTension?: number      // Catmull-Rom 张力 0-1
}
```

**Step 2: 在 Route 接口中添加 topoAnnotations 字段**

在 `packages/shared/src/types/index.ts` 第 71 行（`topoLine` 字段之后）添加：

```typescript
  topoAnnotations?: RouteTopoAnnotation[] // 多图标注列表（新字段，空=未设置）
```

最终 Route 接口的 topo 相关字段变为：

```typescript
export interface Route {
  // ... 现有字段不变 ...
  topoLine?: TopoPoint[]
  topoTension?: number
  topoAnnotations?: RouteTopoAnnotation[] // 新增
}
```

**Step 3: 验证类型检查通过**

```bash
pnpm turbo typecheck 2>&1 | grep -E "error|Error|✓" | head -20
```

期望：无 type error（或仅已有的无关 error）。

**Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat(types): add RouteTopoAnnotation interface and Route.topoAnnotations field"
```

---

## Task 2：兼容层 Helper — getTopoAnnotations()

**Files:**
- Create: `apps/pwa/src/lib/topo-annotations.ts`
- Create: `apps/pwa/src/lib/topo-annotations.test.ts`

**Step 1: 写失败测试**

创建 `apps/pwa/src/lib/topo-annotations.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { getTopoAnnotations } from './topo-annotations'
import type { Route, RouteTopoAnnotation } from '@bloctop/shared/types'

const minimalRoute: Route = {
  id: 1,
  name: '测试线路',
  grade: 'V3',
  cragId: 'test-crag',
  area: '主墙',
}

describe('getTopoAnnotations', () => {
  it('空路由返回空数组', () => {
    expect(getTopoAnnotations(minimalRoute)).toEqual([])
  })

  it('只有旧字段的路由，合成单条标注', () => {
    const route: Route = {
      ...minimalRoute,
      faceId: 'face-1',
      topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
      topoTension: 0.5,
    }
    const result = getTopoAnnotations(route)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      faceId: 'face-1',
      area: '主墙',
      topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
      topoTension: 0.5,
    })
  })

  it('旧字段 topoLine < 2 点时返回空数组', () => {
    const route: Route = {
      ...minimalRoute,
      faceId: 'face-1',
      topoLine: [{ x: 0.1, y: 0.2 }],
    }
    expect(getTopoAnnotations(route)).toEqual([])
  })

  it('有新字段 topoAnnotations 时直接返回新字段', () => {
    const annotations: RouteTopoAnnotation[] = [
      { faceId: 'face-1', area: '主墙', topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] },
      { faceId: 'face-2', area: '主墙', topoLine: [{ x: 0.5, y: 0.6 }, { x: 0.7, y: 0.8 }] },
    ]
    const route: Route = { ...minimalRoute, topoAnnotations: annotations }
    expect(getTopoAnnotations(route)).toEqual(annotations)
  })

  it('topoAnnotations 为空数组时，回退到旧字段', () => {
    const route: Route = {
      ...minimalRoute,
      topoAnnotations: [],
      faceId: 'face-1',
      topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
    }
    const result = getTopoAnnotations(route)
    expect(result).toHaveLength(1)
    expect(result[0].faceId).toBe('face-1')
  })
})
```

**Step 2: 运行测试验证失败**

```bash
pnpm --filter @bloctop/pwa test:run -- topo-annotations
```

期望：FAIL，`Cannot find module './topo-annotations'`

**Step 3: 实现 getTopoAnnotations()**

创建 `apps/pwa/src/lib/topo-annotations.ts`：

```typescript
import type { Route, RouteTopoAnnotation } from '@bloctop/shared/types'

/**
 * 统一读取线路的 topo 标注列表
 * - 优先使用新字段 topoAnnotations
 * - fallback：旧字段 faceId + topoLine → 合成单条标注
 * - 旧字段 topoLine < 2 点视为无效，返回 []
 */
export function getTopoAnnotations(route: Route): RouteTopoAnnotation[] {
  if (route.topoAnnotations && route.topoAnnotations.length > 0) {
    return route.topoAnnotations
  }
  if (
    route.faceId &&
    route.area &&
    route.topoLine &&
    route.topoLine.length >= 2
  ) {
    return [{
      faceId: route.faceId,
      area: route.area,
      topoLine: route.topoLine,
      topoTension: route.topoTension,
    }]
  }
  return []
}
```

**Step 4: 运行测试验证通过**

```bash
pnpm --filter @bloctop/pwa test:run -- topo-annotations
```

期望：5 tests PASS

**Step 5: Commit**

```bash
git add apps/pwa/src/lib/topo-annotations.ts apps/pwa/src/lib/topo-annotations.test.ts
git commit -m "feat(pwa): add getTopoAnnotations compat helper with tests"
```

---

## Task 3：API 层 — PATCH /api/routes/[id] 支持 topoAnnotations

**Files:**
- Modify: `apps/pwa/src/app/api/routes/[id]/route.ts`（在 topoTension 验证块之后，第 202 行附近）

**Step 1: 在 PATCH 处理器中添加 topoAnnotations 验证**

打开 `apps/pwa/src/app/api/routes/[id]/route.ts`，在第 202 行（`topoTension` 验证块结束处）之后，`// 检查是否有需要更新的字段` 注释之前，添加：

```typescript
    // 验证 topoAnnotations
    if (body.topoAnnotations !== undefined) {
      if (body.topoAnnotations === null || body.topoAnnotations.length === 0) {
        updates.topoAnnotations = []
      } else if (!Array.isArray(body.topoAnnotations)) {
        return NextResponse.json(
          { success: false, error: 'topoAnnotations 必须是数组' },
          { status: 400 }
        )
      } else {
        // 验证每条标注
        for (const annotation of body.topoAnnotations) {
          if (
            typeof annotation.faceId !== 'string' ||
            typeof annotation.area !== 'string' ||
            !validateTopoLine(annotation.topoLine)
          ) {
            return NextResponse.json(
              { success: false, error: 'topoAnnotations 中的标注数据格式无效' },
              { status: 400 }
            )
          }
        }
        updates.topoAnnotations = body.topoAnnotations
      }
    }
```

注意：`validateTopoLine` 已在该文件中定义，直接复用即可。需确认 `Partial<Omit<Route, 'id'>>` 现在包含 `topoAnnotations` 字段（Task 1 完成后自动成立）。

**Step 2: 验证类型检查通过**

```bash
pnpm turbo typecheck 2>&1 | grep -E "error TS" | head -20
```

期望：无新增 type error。

**Step 3: 手动测试 API**

启动 dev 服务器：`pnpm --filter @bloctop/pwa dev`

验证逻辑（无需自动化测试，利用现有 route test 文件确认无回归）：

```bash
pnpm --filter @bloctop/pwa test:run -- "routes/\[id\]"
```

期望：现有测试全部通过。

**Step 4: Commit**

```bash
git add apps/pwa/src/app/api/routes/\[id\]/route.ts
git commit -m "feat(api): accept topoAnnotations in PATCH /api/routes/[id]"
```

---

## Task 4：Editor Hook 重构 — use-route-editor.ts

这是本功能最核心的改动。TDD 方式：先写测试，再重构实现。

**Files:**
- Modify: `apps/editor/src/hooks/use-route-editor.test.ts`（在现有测试之后新增 describe 块）
- Modify: `apps/editor/src/hooks/use-route-editor.ts`

### Step 1: 在测试文件中添加多标注测试（失败阶段）

在 `apps/editor/src/hooks/use-route-editor.test.ts` 末尾（第 157 行之后）添加：

```typescript
describe('多图标注管理', () => {
  it('初始化时从旧字段合成 annotations', () => {
    const { result } = setup()
    // mockRoute 有 faceId: 'face-1' 和 topoLine (2 点)
    expect(result.current.annotations).toHaveLength(1)
    expect(result.current.annotations[0].faceId).toBe('face-1')
    expect(result.current.annotations[0].topoLine).toHaveLength(2)
    expect(result.current.activeAnnotationIndex).toBe(0)
  })

  it('初始化时从新字段加载 annotations', () => {
    const routeWithAnnotations: Route = {
      ...mockRoute,
      topoAnnotations: [
        { faceId: 'face-1', area: '主墙', topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] },
        { faceId: 'face-2', area: '主墙', topoLine: [{ x: 0.5, y: 0.6 }, { x: 0.7, y: 0.8 }] },
      ],
    }
    const { result } = setup(routeWithAnnotations)
    expect(result.current.annotations).toHaveLength(2)
    expect(result.current.annotations[1].faceId).toBe('face-2')
  })

  it('addAnnotation 新增标注并激活新 index', () => {
    const { result } = setup()
    act(() => {
      result.current.addAnnotation('face-2', '主墙')
    })
    expect(result.current.annotations).toHaveLength(2)
    expect(result.current.annotations[1].faceId).toBe('face-2')
    expect(result.current.annotations[1].topoLine).toHaveLength(0)
    expect(result.current.activeAnnotationIndex).toBe(1)
  })

  it('removeAnnotation(0) 后 activeAnnotationIndex 不越界', () => {
    const routeWith2 = {
      ...mockRoute,
      topoAnnotations: [
        { faceId: 'face-1', area: '主墙', topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] },
        { faceId: 'face-2', area: '主墙', topoLine: [{ x: 0.5, y: 0.6 }, { x: 0.7, y: 0.8 }] },
      ],
    }
    const { result } = setup(routeWith2)
    act(() => {
      result.current.setActiveAnnotationIndex(1)
    })
    act(() => {
      result.current.removeAnnotation(1)
    })
    expect(result.current.annotations).toHaveLength(1)
    expect(result.current.activeAnnotationIndex).toBe(0)
  })

  it('updateActiveTopoLine 只修改激活标注的 topoLine', () => {
    const routeWith2 = {
      ...mockRoute,
      topoAnnotations: [
        { faceId: 'face-1', area: '主墙', topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] },
        { faceId: 'face-2', area: '主墙', topoLine: [{ x: 0.5, y: 0.6 }, { x: 0.7, y: 0.8 }] },
      ],
    }
    const { result } = setup(routeWith2)
    act(() => {
      result.current.setActiveAnnotationIndex(0)
    })
    act(() => {
      result.current.updateActiveTopoLine([{ x: 0.9, y: 0.9 }, { x: 0.8, y: 0.8 }])
    })
    expect(result.current.annotations[0].topoLine[0]).toEqual({ x: 0.9, y: 0.9 })
    // 第二条标注不变
    expect(result.current.annotations[1].topoLine[0]).toEqual({ x: 0.5, y: 0.6 })
  })

  it('保存时 patch body 包含 topoAnnotations 和 compat sync', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.handleSave()
    })
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    // 新字段
    expect(body.topoAnnotations).toBeDefined()
    expect(Array.isArray(body.topoAnnotations)).toBe(true)
    // compat sync：旧字段与第一条标注一致
    expect(body.faceId).toBe(result.current.annotations[0]?.faceId ?? null)
  })

  it('添加标注后 hasUnsavedChanges 返回 true', () => {
    const { result } = setup()
    act(() => {
      result.current.addAnnotation('face-2', '主墙')
    })
    expect(result.current.hasUnsavedChanges()).toBe(true)
  })
})
```

**Step 2: 运行测试验证失败**

```bash
pnpm --filter @bloctop/editor test:run 2>&1 | tail -20
```

期望：新增的多标注测试全部 FAIL（`annotations`/`addAnnotation` 未定义）。

**Step 3: 重构 use-route-editor.ts**

用以下内容替换 `apps/editor/src/hooks/use-route-editor.ts`（保留现有所有功能，新增标注管理）：

**关键变更点（逐一说明）：**

1. **Import 新增类型**，在第 2 行 `import type { Route, TopoPoint }` 改为：
   ```typescript
   import type { Route, TopoPoint, RouteTopoAnnotation } from '@bloctop/shared/types'
   ```

2. **替换旧 topo 状态**，将：
   ```typescript
   const [topoLine, setTopoLine] = useState<TopoPoint[]>([])
   const [topoTension, setTopoTension] = useState(0)
   const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null)
   ```
   改为：
   ```typescript
   const [annotations, setAnnotations] = useState<RouteTopoAnnotation[]>([])
   const [activeAnnotationIndex, setActiveAnnotationIndex] = useState(0)
   ```

   并添加派生值（computed）：
   ```typescript
   const activeAnnotation = annotations[activeAnnotationIndex] ?? null
   const topoLine = activeAnnotation?.topoLine ?? []
   const topoTension = activeAnnotation?.topoTension ?? 0
   const selectedFaceId = activeAnnotation?.faceId ?? null
   ```

3. **初始化 useEffect**，替换旧的 `setTopoLine`/`setTopoTension`/`setSelectedFaceId` 为：
   ```typescript
   // 从路由数据初始化 annotations（兼容旧字段）
   const initialAnnotations = route.topoAnnotations?.length
     ? route.topoAnnotations
     : route.faceId && route.topoLine?.length >= 2
       ? [{ faceId: route.faceId, area: route.area, topoLine: route.topoLine, topoTension: route.topoTension }]
       : []
   setAnnotations(initialAnnotations as RouteTopoAnnotation[])
   setActiveAnnotationIndex(0)
   ```

   imageUrl 初始化改为使用 `activeAnnotation`：
   ```typescript
   const auto = initialAnnotations[0] ?? null
   if (auto) {
     const url = faceImageCache.getImageUrl({ cragId: route.cragId, area: auto.area, faceId: auto.faceId })
     setImageUrl(url)
     setIsImageLoading(true)
     setImageLoadError(false)
     setImageAspectRatio(undefined)
   } else {
     setImageUrl(null)
     setImageLoadError(false)
   }
   ```

4. **新增操作函数**：
   ```typescript
   const addAnnotation = useCallback((faceId: string, area: string) => {
     const newAnnotation: RouteTopoAnnotation = { faceId, area, topoLine: [] }
     setAnnotations(prev => {
       const next = [...prev, newAnnotation]
       setActiveAnnotationIndex(next.length - 1)
       const url = faceImageCache.getImageUrl({ cragId: selectedRoute!.cragId, area, faceId })
       setImageUrl(url)
       setIsImageLoading(true)
       setImageLoadError(false)
       setImageAspectRatio(undefined)
       return next
     })
   }, [selectedRoute, faceImageCache])

   const removeAnnotation = useCallback((index: number) => {
     setAnnotations(prev => {
       const next = prev.filter((_, i) => i !== index)
       setActiveAnnotationIndex(i => Math.min(i, Math.max(0, next.length - 1)))
       return next
     })
   }, [])

   const updateActiveTopoLine = useCallback((points: TopoPoint[]) => {
     setAnnotations(prev => prev.map((a, i) =>
       i === activeAnnotationIndex ? { ...a, topoLine: points } : a
     ))
   }, [activeAnnotationIndex])

   const updateActiveTopoTension = useCallback((tension: number) => {
     setAnnotations(prev => prev.map((a, i) =>
       i === activeAnnotationIndex ? { ...a, topoTension: tension } : a
     ))
   }, [activeAnnotationIndex])
   ```

5. **修改 handleFaceSelect**（替换为 setActiveAnnotation 或切换激活标注的 face）：

   注意：现有的 `handleFaceSelect` 用于从 FaceSelector 选 face。在新设计中，这只用于「新增标注时选择 face」（通过 `addAnnotation`），不再单独存在。但为了兼容 routes/page.tsx 现有调用，保留 `handleFaceSelect` 但改为调用 `addAnnotation`（如果当前无标注）或更新当前激活标注的 face：
   ```typescript
   const handleFaceSelect = useCallback((faceId: string, area: string) => {
     // 用于「新增标注」场景
     addAnnotation(faceId, area)
   }, [addAnnotation])
   ```

6. **修改 handleClearPoints** 改用 `updateActiveTopoLine`：
   ```typescript
   const handleClearPoints = useCallback(() => {
     updateActiveTopoLine([])
     updateActiveTopoTension(0)
   }, [updateActiveTopoLine, updateActiveTopoTension])

   const handleRemoveLastPoint = useCallback(() => {
     updateActiveTopoLine(topoLine.slice(0, -1))
   }, [topoLine, updateActiveTopoLine])
   ```

7. **修改 handleSave** 的 fetch body：
   ```typescript
   const validAnnotations = annotations.filter(a => a.topoLine.length >= 2)
   const first = validAnnotations[0]
   body: JSON.stringify({
     ...editedRoute,
     topoAnnotations: validAnnotations,
     // compat sync
     faceId: first?.faceId ?? null,
     topoLine: first?.topoLine ?? null,
     topoTension: first?.topoTension ?? null,
   })
   ```

8. **修改 hasUnsavedChanges**：
   - 移除对 `selectedFaceId`/`topoLine`/`topoTension` 的直接比较
   - 改为比较 `annotations` 与 `getInitialAnnotations(selectedRoute)`

9. **修改 return 对象**，新增：
   ```typescript
   annotations,
   activeAnnotationIndex,
   setActiveAnnotationIndex,
   addAnnotation,
   removeAnnotation,
   updateActiveTopoLine,
   updateActiveTopoTension,
   // 保留 topoLine/selectedFaceId 等作为当前激活标注的派生值，供现有 UI 组件读取
   topoLine,       // = activeAnnotation?.topoLine ?? []
   topoTension,    // = activeAnnotation?.topoTension ?? 0
   selectedFaceId, // = activeAnnotation?.faceId ?? null
   ```

**Step 4: 运行所有 Editor 测试**

```bash
pnpm --filter @bloctop/editor test:run
```

期望：所有测试（含新增多标注测试）全部 PASS，无回归。

**Step 5: Commit**

```bash
git add apps/editor/src/hooks/use-route-editor.ts apps/editor/src/hooks/use-route-editor.test.ts
git commit -m "refactor(editor): add multi-annotation state management to use-route-editor"
```

---

## Task 5：Editor UI — 标注 Tab 栏

**Files:**
- Modify: `apps/editor/src/app/routes/page.tsx`（在 topo 画布区域上方添加标注切换 UI）

**目标 UI：**

```
┌─────────────────────────────────────────────┐
│  [+ 添加标注]  [角1 ×]  [角2 ×]            │  ← 标注 tab 栏
├─────────────────────────────────────────────┤
│         [岩面图片 + topoLine 画布]           │
└─────────────────────────────────────────────┘
```

**Step 1: 在 routes/page.tsx 找到 topo 画布区域**

搜索 `editor.imageUrl`（大约在第 655 行），在其正上方（而非内部）添加标注 tab 栏。

**Step 2: 在合适位置添加 AnnotationTabBar 内联组件**

在 routes/page.tsx 中，找到 topo 画布 div（包含 `imageUrl={editor.imageUrl}` 的那个区域），在其紧上方插入：

```tsx
{/* 多图标注 Tab 栏 */}
{selectedRoute && (
  <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
    {editor.annotations.map((annotation, index) => (
      <button
        key={`${annotation.faceId}-${index}`}
        onClick={() => editor.setActiveAnnotationIndex(index)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
          index === editor.activeAnnotationIndex
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        <span>角度{index + 1}</span>
        <span
          role="button"
          className="ml-0.5 opacity-60 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            editor.removeAnnotation(index)
          }}
          aria-label={`删除标注${index + 1}`}
        >
          ×
        </span>
      </button>
    ))}
    {/* 添加标注按钮：触发 FaceSelector */}
    <button
      onClick={() => setShowFaceSelector(true)}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-border hover:bg-accent transition-colors whitespace-nowrap"
    >
      + 添加标注
    </button>
  </div>
)}
```

**Step 3: 添加 showFaceSelector 状态**

在 routes/page.tsx 的组件顶部状态区域（搜索 `const [` 的部分），添加：

```tsx
const [showFaceSelector, setShowFaceSelector] = useState(false)
```

**Step 4: 连接 FaceSelector 到 showFaceSelector**

搜索现有的 FaceSelector 调用（大约在 Tab 区域），确认其可见性由 `showFaceSelector` 控制，且 `onSelect` 回调调用 `editor.addAnnotation`。

找到 FaceSelector 的 `onSelect` prop，改为：

```tsx
onSelect={(faceId, area) => {
  editor.addAnnotation(faceId, area)
  setShowFaceSelector(false)
}}
```

**Step 5: setTopoLine 调用改为 updateActiveTopoLine**

在 routes/page.tsx 中，所有的 `editor.setTopoLine(...)` 调用（来自画布点击事件），改为 `editor.updateActiveTopoLine(...)`。

搜索 `setTopoLine`，替换为：

```tsx
// 旧：editor.setTopoLine(prev => [...prev, newPoint])
// 新：
editor.updateActiveTopoLine([...editor.topoLine, newPoint])
```

**Step 6: 手动验证（无自动测试）**

启动 `pnpm --filter @bloctop/editor dev`，打开线路编辑器：

- [ ] 选择已有线路，标注栏显示现有标注（角度1）
- [ ] 点击"+ 添加标注"，FaceSelector 弹出，选择一个 face，新 tab 出现（角度2）
- [ ] 在角度2画 topoLine，切换到角度1，角度1的 topoLine 不变
- [ ] 点击角度2的 ×，角度2消失，激活回角度1
- [ ] 点击保存，API 调用 body 包含 `topoAnnotations`

**Step 7: Commit**

```bash
git add apps/editor/src/app/routes/page.tsx
git commit -m "feat(editor): add annotation tab bar for multi-topo annotation editing"
```

---

## Task 6：PWA Carousel — route-detail-drawer.tsx

**Files:**
- Modify: `apps/pwa/src/components/route-detail-drawer.tsx`

**Step 1: 在 route-detail-drawer.tsx 顶部添加 import**

```typescript
import { getTopoAnnotations } from '@/lib/topo-annotations'
import type { RouteTopoAnnotation } from '@bloctop/shared/types'
```

**Step 2: 添加 carousel 状态**

在组件 state 区域（第 52 行附近）添加：

```typescript
const [activeAnnotationIndex, setActiveAnnotationIndex] = useState(0)
```

**Step 3: 计算 annotations**

在 `const hasTopoLine = ...` 之前添加：

```typescript
// 多图标注（兼容旧字段）
const topoAnnotations = getTopoAnnotations(route)
const hasMultiAnnotations = topoAnnotations.length > 1
const hasSingleAnnotation = topoAnnotations.length === 1
```

**Step 4: 重置激活 index（路由切换时）**

找到 `useEffect(() => { ... }, [isOpen, ...])` 的地方，在 reset 逻辑中添加：

```typescript
setActiveAnnotationIndex(0)
```

**Step 5: 替换图片区域（单图 → 条件 Carousel）**

找到第 182 行的图片区域 div（`className="relative w-full mb-4 overflow-hidden"`）。

**单张图（annotations.length <= 1）**：保持现有逻辑不变（`useFaceImage(route)` 已处理）。

**多张图（hasMultiAnnotations）**：将整个图片 button 替换为 Carousel：

```tsx
{hasMultiAnnotations ? (
  /* 多图轮播模式 */
  <div className="relative w-full h-full">
    {/* scroll-snap 容器 */}
    <div
      className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      ref={carouselRef}
      onScroll={handleCarouselScroll}
    >
      {topoAnnotations.map((annotation, index) => (
        <AnnotationSlide
          key={`${annotation.faceId}-${index}`}
          annotation={annotation}
          route={route}
          routeColor={routeColor}
          imageAspectRatio={imageAspectRatio}
          setImageAspectRatio={setImageAspectRatio}
          onClick={() => setImageViewerOpen(true)}
          onClose={onClose}
        />
      ))}
    </div>
    {/* 页码圆点 */}
    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
      {topoAnnotations.map((_, index) => (
        <button
          key={index}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            index === activeAnnotationIndex ? 'bg-white' : 'bg-white/40'
          }`}
          onClick={() => scrollToAnnotation(index)}
          aria-label={`切换到角度${index + 1}`}
        />
      ))}
    </div>
    {/* 右上角关闭按钮 */}
    <div
      className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="button"
    >
      <X className="w-4.5 h-4.5 text-white" />
    </div>
  </div>
) : (
  /* 原有单图模式（不变） */
  ... 现有代码 ...
)}
```

**Step 6: 添加 carouselRef 和滚动处理**

在 state 区域添加：

```typescript
const carouselRef = useRef<HTMLDivElement>(null)

const handleCarouselScroll = useCallback(() => {
  if (!carouselRef.current) return
  const el = carouselRef.current
  const index = Math.round(el.scrollLeft / el.clientWidth)
  setActiveAnnotationIndex(index)
}, [])

const scrollToAnnotation = useCallback((index: number) => {
  if (!carouselRef.current) return
  carouselRef.current.scrollTo({ left: index * carouselRef.current.clientWidth, behavior: 'smooth' })
}, [])
```

**Step 7: 创建 AnnotationSlide 子组件**

在 route-detail-drawer.tsx 文件顶部（组件外）定义 AnnotationSlide：

```tsx
interface AnnotationSlideProps {
  annotation: RouteTopoAnnotation
  route: Route
  routeColor: string
  imageAspectRatio: number | undefined
  setImageAspectRatio: (ratio: number) => void
  onClick: () => void
  onClose: () => void
}

function AnnotationSlide({
  annotation, route, routeColor, imageAspectRatio, setImageAspectRatio, onClick, onClose
}: AnnotationSlideProps) {
  const faceRoute = { ...route, faceId: annotation.faceId, area: annotation.area }
  const { src, isLoading, isError, onLoad, onError } = useFaceImage(faceRoute)

  return (
    <button
      className="relative flex-none w-full h-full snap-start"
      onClick={onClick}
      aria-label="点击放大"
    >
      {isLoading && <div className="absolute inset-0 skeleton-shimmer" />}
      {!isError && src && (
        <Image
          src={src}
          alt={route.name}
          fill
          className={`object-contain transition-all duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          sizes="(max-width: 768px) 100vw, 50vw"
          onLoad={(e) => {
            onLoad()
            const img = e.currentTarget as HTMLImageElement
            if (img.naturalWidth && img.naturalHeight) {
              setImageAspectRatio(img.naturalWidth / img.naturalHeight)
            }
          }}
          onError={onError}
        />
      )}
      {!isLoading && annotation.topoLine.length >= 2 && (
        <TopoLineOverlay
          points={annotation.topoLine}
          color={routeColor}
          tension={annotation.topoTension}
          animated
          objectFit="contain"
          aspectRatio={imageAspectRatio}
        />
      )}
    </button>
  )
}
```

**Step 8: ImageViewer — 传递当前激活标注的图片 URL**

对于多标注情况，ImageViewer 显示当前激活标注的图片：

找到 `<ImageViewer` 调用处（第 511 行附近），将 `src={topoImageUrl!}` 改为：

```tsx
src={
  hasMultiAnnotations
    ? (() => {
        const ann = topoAnnotations[activeAnnotationIndex]
        // 使用 getFaceTopoUrl 直接获取 URL
        return ann
          ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL || 'https://img.bouldering.top'}/${ann.faceId}.jpg`
          : topoImageUrl!
      })()
    : topoImageUrl!
}
```

> 注意：`useFaceImage` hook 接受 route 对象来计算 URL。对于全屏查看，简单做法是将当前激活标注的 `faceRoute` 对象传给一个 `useFaceImageForAnnotation` 调用。实际上可以直接使用 `faceImageCache.getImageUrl()` 来获取 URL。

更简洁的做法：在组件中根据 `activeAnnotationIndex` 计算当前 imageUrl：

```typescript
const activeAnnotation = hasMultiAnnotations ? topoAnnotations[activeAnnotationIndex] : null
const activeImageUrl = activeAnnotation
  ? faceImageCache.getImageUrl({ cragId: route.cragId, area: activeAnnotation.area, faceId: activeAnnotation.faceId })
  : topoImageUrl
```

注意：需要通过 `useFaceImageCache()` hook 获取 `faceImageCache`。

**Step 9: 手动验证**

启动 PWA dev 服务器，打开一条有 `topoAnnotations` 的线路：

- [ ] 单图线路：显示与之前完全相同
- [ ] 多图线路：显示轮播，可左右滑动
- [ ] 滑动后页码圆点更新
- [ ] 点击放大，显示当前激活图片

**Step 10: Commit**

```bash
git add apps/pwa/src/components/route-detail-drawer.tsx
git commit -m "feat(pwa): add multi-annotation carousel to route-detail-drawer"
```

---

## Task 7：ImageViewer 全屏多图支持

**Files:**
- Modify: `packages/ui/src/components/image-viewer.tsx`

**目标：** ImageViewer 支持接收 `images` 数组，全屏也可左右切换。

**Step 1: 扩展 ImageViewer props 类型**

在 `packages/ui/src/components/image-viewer.tsx` 的 `ImageViewerProps` 接口中新增可选字段：

```typescript
interface ImageViewerProps {
  isOpen: boolean
  onClose: () => void
  src: string        // 单图模式（保持向后兼容）
  alt?: string
  children?: React.ReactNode
  topSlot?: React.ReactNode
  // 多图模式（可选）
  images?: string[]              // 所有图片 URL
  activeImageIndex?: number      // 当前显示 index
  onImageChange?: (index: number) => void  // 切换回调（同步 drawer 状态）
}
```

**Step 2: 在组件中添加多图导航**

当 `images && images.length > 1` 时，在全屏底部控制栏旁边添加左右箭头按钮：

```tsx
{images && images.length > 1 && (
  <>
    {/* 左箭头 */}
    <button
      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => onImageChange?.(Math.max(0, (activeImageIndex ?? 0) - 1))}
      disabled={(activeImageIndex ?? 0) === 0}
    >
      <ChevronLeft className="w-5 h-5 text-white" />
    </button>
    {/* 右箭头 */}
    <button
      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => onImageChange?.(Math.min(images.length - 1, (activeImageIndex ?? 0) + 1))}
      disabled={(activeImageIndex ?? 0) === images.length - 1}
    >
      <ChevronRight className="w-5 h-5 text-white" />
    </button>
  </>
)}
```

显示的图片改为：`src={images ? images[activeImageIndex ?? 0] : src}`

**Step 3: 更新 route-detail-drawer.tsx 中的 ImageViewer 调用（多图情况）**

```tsx
<ImageViewer
  isOpen={imageViewerOpen}
  onClose={() => setImageViewerOpen(false)}
  src={topoAnnotations[activeAnnotationIndex] ? activeImageUrl! : topoImageUrl!}
  alt={route.name}
  images={hasMultiAnnotations ? topoAnnotations.map(a =>
    faceImageCache.getImageUrl({ cragId: route.cragId, area: a.area, faceId: a.faceId })
  ) : undefined}
  activeImageIndex={hasMultiAnnotations ? activeAnnotationIndex : undefined}
  onImageChange={hasMultiAnnotations ? (index) => {
    setActiveAnnotationIndex(index)
    scrollToAnnotation(index)
  } : undefined}
  topSlot={...}
>
  {/* TopoLine overlay for current active annotation */}
  {topoAnnotations[activeAnnotationIndex]?.topoLine?.length >= 2 && (
    <TopoLineOverlay
      points={topoAnnotations[activeAnnotationIndex].topoLine}
      color={routeColor}
      tension={topoAnnotations[activeAnnotationIndex].topoTension}
      animated
      objectFit="contain"
      aspectRatio={imageAspectRatio}
    />
  )}
</ImageViewer>
```

**Step 4: 运行全量测试**

```bash
pnpm --filter @bloctop/pwa test:run
```

期望：全部通过（包含 Task 2 的 getTopoAnnotations 测试）。

**Step 5: Commit**

```bash
git add packages/ui/src/components/image-viewer.tsx apps/pwa/src/components/route-detail-drawer.tsx
git commit -m "feat(pwa): add multi-image navigation to ImageViewer and sync with carousel"
```

---

## 最终验证清单

```bash
# 全量测试
pnpm --filter @bloctop/pwa test:run
pnpm --filter @bloctop/editor test:run

# 类型检查
pnpm turbo typecheck

# 端到端手动验证
# 1. 旧路由（只有 faceId + topoLine）- PWA 展示无变化
# 2. 编辑旧路由 - 编辑器标注栏显示 1 个 tab（角度1），topoLine 正确加载
# 3. 添加第 2 个标注，保存，数据库写入 topoAnnotations
# 4. 重新打开 PWA，该线路出现双图轮播
# 5. 全屏模式可切换多图
```

---

## 不在范围内（明确不实现）

- 标注排序拖拽
- 离线模式 carousel（离线页面继续用旧字段 fallback）
- DB 迁移脚本（懒迁移，不需要）
- 线路专属图片上传（复用现有 face 库）
