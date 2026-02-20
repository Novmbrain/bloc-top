# 线路多图标注设计文档

**日期**: 2026-02-20
**功能**: 一条线路支持多张 topo 图标注，PWA 端轮播展示
**状态**: 设计已确认

---

## 背景与目标

当前每条线路只能关联一个 `faceId`（岩面），配一条 `topoLine` 标注。
用户希望一条线路可以从**多个角度**拍摄标注，在 PWA 端通过滑动查看。

**目标**：
- Editor：同页面 tab 切换，管理一条线路的多个标注
- PWA：在 route-detail-drawer 中左右滑动查看多张标注图

---

## 数据模型

### 新增类型（`packages/shared/src/types/index.ts`）

```typescript
export interface RouteTopoAnnotation {
  faceId: string
  area: string
  topoLine: TopoPoint[]     // 有效值：至少 2 个点
  topoTension?: number      // Catmull-Rom 张力 0-1
}
```

### 修改 Route 接口

```typescript
export interface Route {
  // ... 现有字段不变 ...

  // 新增：多图标注列表
  topoAnnotations?: RouteTopoAnnotation[]

  // 保留旧字段（向后兼容 fallback）
  faceId?: string
  topoLine?: TopoPoint[]
  topoTension?: number
}
```

### 向后兼容策略

- **读取**：PWA/Editor 使用 `getTopoAnnotations(route)` helper 统一获取
  - `topoAnnotations` 非空 → 使用新字段
  - `topoAnnotations` 为空 + 旧 `faceId`+`topoLine` 存在 → 合成单条标注
  - 否则 → 返回 `[]`
- **写入**：Editor 保存时写入 `topoAnnotations`，同时将第一条同步到旧字段（compat sync）
- **无需 DB 迁移脚本**：旧数据懒迁移，首次在新 Editor 保存时自动升级

---

## Editor 端设计

### 受影响文件
- `apps/editor/src/hooks/use-route-editor.ts`
- `apps/editor/src/app/routes/page.tsx`

### 状态变更（`use-route-editor.ts`）

```typescript
// 旧
const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null)
const [topoLine, setTopoLine] = useState<TopoPoint[]>([])
const [topoTension, setTopoTension] = useState(0)

// 新（替代旧字段）
const [annotations, setAnnotations] = useState<RouteTopoAnnotation[]>([])
const [activeAnnotationIndex, setActiveAnnotationIndex] = useState(0)
```

### 操作接口

```typescript
addAnnotation(faceId: string, area: string): void
// 新建空标注，激活它

removeAnnotation(index: number): void
// 删除，激活 index 回退到 Math.min(index, length-1)

setActiveAnnotation(index: number): void
// 切换激活标注，画布联动

updateActiveTopoLine(points: TopoPoint[]): void
updateActiveTopoTension(tension: number): void
// 修改当前激活标注的数据
```

### 初始化（兼容旧数据）

```typescript
// 加载路由时
const existing = route.topoAnnotations?.length
  ? route.topoAnnotations
  : route.faceId && route.topoLine?.length >= 2
    ? [{ faceId: route.faceId, area: route.area, topoLine: route.topoLine, topoTension: route.topoTension }]
    : []
setAnnotations(existing)
setActiveAnnotationIndex(0)
```

### 保存逻辑

```typescript
// 构建 patch body
const validAnnotations = annotations.filter(a => a.topoLine.length >= 2)
const firstAnnotation = validAnnotations[0]

const body = {
  ...editedRoute,
  topoAnnotations: validAnnotations,
  // compat sync：旧字段同步自第一条标注
  faceId: firstAnnotation?.faceId ?? null,
  topoLine: firstAnnotation?.topoLine ?? null,
  topoTension: firstAnnotation?.topoTension ?? null,
}
```

### UI 布局（`routes/page.tsx`）

在 topo 画布上方添加标注 tab 栏：

```
┌─────────────────────────────────────────────┐
│  [+ 添加标注]  [图1 ×]  [图2 ×]  [图3 ×]   │  ← 标注切换 tab
├─────────────────────────────────────────────┤
│                                             │
│         [岩面图片 + topoLine 画布]           │  ← 激活标注的内容
│                                             │
└─────────────────────────────────────────────┘
```

- `[+ 添加标注]` → 打开 FaceSelector → 选 face → `addAnnotation()`
- `[图N]` → `setActiveAnnotation(N)`，画布切换
- `[×]` → `removeAnnotation(N)`
- 画布操作（画线/清除/张力）→ `updateActiveTopoLine` / `updateActiveTopoTension`

### hasUnsavedChanges

比较 `annotations` 数组与 `route.topoAnnotations`（考虑 legacy 合成）。

---

## PWA 端设计

### 受影响文件
- `apps/pwa/src/components/route-detail-drawer.tsx`
- `apps/pwa/src/components/ui/image-viewer.tsx`（扩展多图）
- 新增：`apps/pwa/src/lib/topo-annotations.ts`（兼容层 helper）

### 兼容层 helper

```typescript
// apps/pwa/src/lib/topo-annotations.ts
export function getTopoAnnotations(route: Route): RouteTopoAnnotation[] {
  if (route.topoAnnotations?.length) return route.topoAnnotations
  if (route.faceId && route.area && route.topoLine && route.topoLine.length >= 2) {
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

### 展示逻辑

| 标注数量 | 展示方式 |
|---------|---------|
| 0 | 无图（现有行为不变）|
| 1 | 单图（现有行为不变，无轮播 UI）|
| ≥2 | 图片轮播 carousel + 页码指示器 |

### Carousel 设计

使用 CSS scroll-snap 原生实现（无额外依赖）：

```
┌────────────────────────────┐
│                            │
│   [岩面图 + topoLine 叠层]  │  ← swipe 左右切换
│                            │
└─────────────────────────────
           ● ○ ○             ← 页码圆点指示器（当前第1/共3张）
```

- 每张图独立渲染 `TopoLineOverlay`（已有组件）
- 图片缓存通过 `useFaceImage(faceKey)` hook 各自独立加载
- 页码圆点点击可跳转到指定图

### ImageViewer 扩展

全屏模式：接收 `annotations` 数组 + `activeIndex`，支持多图滑动（保持与缩略图视图同步）。

---

## API 层

### PATCH `/api/routes/[id]`

接受新字段 `topoAnnotations`（JSON array），无其他变更。
验证：每条标注的 `topoLine` 至少 2 点。

### GET `/api/crags/[id]/routes`

返回 routes 数组，`topoAnnotations` 字段原样透传，无需额外处理。

---

## 测试策略

### 单元测试（Vitest）

1. **`getTopoAnnotations()` helper**（`topo-annotations.test.ts`）：
   - 旧路由 → 合成 1 条标注
   - 新路由 → 直接返回 annotations
   - 空路由 → `[]`

2. **`use-route-editor` 标注管理**：
   - `addAnnotation` 增加条目，激活新 index
   - `removeAnnotation(0)` 后 index 正确回退
   - 保存 body 的 compat sync 正确（`faceId` 同步自 `annotations[0]`）
   - `hasUnsavedChanges` 在增/删/改标注后返回 `true`

### 不需要新 E2E

topoLine 画布本身已有测试覆盖，carousel 交互使用 CSS scroll-snap 无复杂逻辑。

---

## 实施顺序（建议）

1. **类型层**：`RouteTopoAnnotation` + Route 类型修改
2. **兼容层 helper**：`getTopoAnnotations()` + 测试
3. **Editor hook**：`use-route-editor` 重构 + 测试
4. **Editor UI**：标注 tab 栏 + 画布联动
5. **API**：PATCH 接受 `topoAnnotations`
6. **PWA Carousel**：`route-detail-drawer` 轮播
7. **ImageViewer 扩展**：全屏多图支持

---

## 不在范围内

- 标注排序（无顺序，全部平等）
- 线路专属图片上传（复用现有 face 库）
- DB 迁移脚本（懒迁移，不需要）
- 离线模式的 carousel（离线页面用旧字段 fallback）
