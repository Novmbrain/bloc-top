# React 最佳实践审计报告

> 基于 Vercel React Best Practices 45 条规则，对项目前端页面的全面分析
> 日期: 2026-02-11

---

## 评估总览

| 优先级 | 类别 | 影响级别 | 现状评分 | 发现问题数 |
|--------|------|---------|---------|-----------|
| 1 | 消除瀑布流 (Waterfalls) | CRITICAL | ★★★★☆ | 2 |
| 2 | Bundle 体积优化 | CRITICAL | ★★★☆☆ | 4 |
| 3 | 服务端性能 | HIGH | ★★★★☆ | 2 |
| 4 | 客户端数据获取 | MEDIUM-HIGH | ★★☆☆☆ | 3 |
| 5 | 重渲染优化 | MEDIUM | ★★★☆☆ | 4 |
| 6 | 渲染性能 | MEDIUM | ★★★☆☆ | 3 |
| 7 | JavaScript 性能 | LOW-MEDIUM | ★★★★☆ | 3 |
| 8 | 高级模式 | LOW | ★★★★☆ | 1 |

**总发现**: 22 项改进建议（6 CRITICAL / 4 HIGH / 8 MEDIUM / 4 LOW）

---

## 已做得好的地方

在进入改进建议之前，先肯定项目中已有的优秀实践：

- **Server Components + ISR**: 所有公开页面 (`page.tsx`) 均为 Server Components，数据在服务端获取，配合 30 天 ISR 缓存
- **并行数据获取**: 首页、岩场详情、线路列表页均使用 `Promise.all()` 并行获取数据
- **RSC Payload 裁剪**: 首页 `page.tsx` 通过 `lightRoutes` 剥离客户端不需要的大字段 (`topoLine`, `description`)
- **动态导入重组件**: `FullscreenTopoEditor` 使用 `next/dynamic({ ssr: false })`，`browser-image-compression` 按需动态导入
- **高德地图延迟加载**: `AMapContainer` 通过 `import()` 动态加载 SDK，避免 SSR 问题
- **`useTransition` 降优先级**: 线路列表页使用 `startTransition` 包裹 URL 参数更新

---

## 1. 消除瀑布流 — CRITICAL

### 1.1 `generateMetadata` 与 `Page` 组件重复获取（`server-cache-react`）

**文件**: `src/app/[locale]/crag/[id]/page.tsx:20-53`

**问题**: `generateMetadata` 和 `CragDetailPage` 都调用了 `getCragById(id)`，形成隐式瀑布（Next.js 先执行 metadata，再执行 page）。虽然 Next.js 会在同一请求中做 `fetch` 自动去重，但 `getCragById` 是直接调用 MongoDB，不经过 `fetch`，因此无法自动去重。

**影响**: 每次页面请求，`getCragById` 被调用两次，多一次 MongoDB 查询。

**修复建议**: 使用 `React.cache()` 包裹数据库查询函数：

```tsx
// src/lib/db/index.ts
import { cache } from 'react'

export const getCragById = cache(async (id: string) => {
  const db = await getDatabase()
  return db.collection('crags').findOne({ id })
})
```

### 1.2 编辑器页面三级串行请求瀑布（`async-parallel`）

**文件**: `src/app/[locale]/editor/faces/page.tsx` & `routes/page.tsx`

**问题**: 编辑器页面通过 `useCragRoutes` hook 产生三级串行请求：
1. `GET /api/crags`（加载岩场列表）
2. 等岩场加载完 → `GET /api/crags/{id}/routes`（加载线路）
3. 等线路加载完 → `GET /api/faces?cragId=xxx`（加载 R2 岩面列表）

每级请求依赖前一级结果，但第 2、3 级可以并行（都依赖 cragId，不互相依赖）。

**影响**: 编辑器首次加载时间 ≈ RTT₁ + RTT₂ + RTT₃，可优化为 RTT₁ + max(RTT₂, RTT₃)。

**修复建议**: 在 `useCragRoutes` 中，当 `selectedCragId` 确定后并行加载 routes 和 faces：

```tsx
useEffect(() => {
  if (!selectedCragId) return
  // 并行加载 routes + faces
  Promise.all([
    fetch(`/api/crags/${selectedCragId}/routes`).then(r => r.json()),
    fetch(`/api/faces?cragId=${encodeURIComponent(selectedCragId)}`).then(r => r.json()),
  ]).then(([routeData, faceData]) => {
    setRoutes(routeData.routes || [])
    if (faceData.success) setR2Faces(faceData.faces)
  })
}, [selectedCragId])
```

---

## 2. Bundle 体积优化 — CRITICAL

### 2.1 编辑器页面 God Component 问题（`bundle-dynamic-imports`）

**文件**: `src/app/[locale]/editor/faces/page.tsx`（1167 行）、`routes/page.tsx`（1293 行）

**问题**: 两个编辑器页面都是单文件超大 Client Component，包含：
- 20-30 个 `useState`
- 多个对话框（覆盖确认、删除确认、未保存确认）
- 完整的左栏 + 右栏 JSX

所有代码在页面加载时全部进入 JS bundle，即使对话框可能永远不会打开。

**影响**: 编辑器页面 JS bundle 偏大，首屏加载不需要的对话框代码也被包含。

**修复建议**:
1. 将确认对话框（OverwriteConfirmDialog、DeleteConfirmDialog、UnsavedChangesDialog）抽取为独立组件
2. 使用 `next/dynamic` 延迟加载：

```tsx
const OverwriteConfirmDialog = dynamic(
  () => import('./overwrite-confirm-dialog'),
  { ssr: false }
)
```

### 2.2 RouteDetailDrawer 子抽屉未延迟加载（`bundle-conditional`）

**文件**: `src/components/route-detail-drawer.tsx:8-9`

**问题**: `BetaListDrawer` 和 `BetaSubmitDrawer` 在顶部静态导入，但仅在用户点击 "Beta 视频" 按钮后才显示。对于大多数用户，这两个组件永远不会被使用。

**修复建议**:

```tsx
const BetaListDrawer = dynamic(() =>
  import('@/components/beta-list-drawer').then(m => ({ default: m.BetaListDrawer })),
  { ssr: false }
)
const BetaSubmitDrawer = dynamic(() =>
  import('@/components/beta-submit-drawer').then(m => ({ default: m.BetaSubmitDrawer })),
  { ssr: false }
)
```

### 2.3 线路列表页传输全量 Route 数据（`server-serialization` / `bundle-*`）

**文件**: `src/app/[locale]/route/page.tsx:16-24`

**问题**: 首页已做了 `lightRoutes` 裁剪（去除 `topoLine`, `description`, `image`, `setter`），但线路列表页 `route/page.tsx` 将 **全量 Route 数据**（含 `topoLine`、`betaLinks`）传给 `RouteListClient`。

`topoLine` 是一个坐标数组（每条线路可能有 10-20 个点），`betaLinks` 包含嵌套对象。列表页面根本不需要这些字段。

**影响**: RSC payload 增大，客户端接收的 JSON 体积增加，首屏解析和注水更慢。

**修复建议**: 在 `route/page.tsx` 中做同样的裁剪：

```tsx
const lightRoutes = routes.map(({ topoLine, betaLinks, image, ...rest }) => rest)
return <RouteListClient routes={lightRoutes} crags={crags} />
```

**注意**: `RouteDetailDrawer` 需要 `topoLine` 和 `betaLinks`，但可以在抽屉打开时按需从 API 获取单条线路的完整数据。

### 2.4 高德地图 CSS/JS 始终在 CSR 中加载（`bundle-defer-third-party`）

**文件**: `src/components/amap-container.tsx`

**问题**: `AMapContainer` 虽然使用了动态 `import()`，但它作为 `CragDetailClient` 的直接子组件在组件树中渲染。即使用户可能不会向下滚动到地图区域，地图 SDK 也会在组件挂载时立即加载。

**修复建议**: 使用 IntersectionObserver 实现"进入视口才加载"：

```tsx
function LazyAMapContainer(props: AMapContainerProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ minHeight: props.height }}>
      {visible && <AMapContainer {...props} />}
    </div>
  )
}
```

---

## 3. 服务端性能 — HIGH

### 3.1 数据库查询缺少 `React.cache()` 去重（`server-cache-react`）

**文件**: `src/lib/db/index.ts`

**问题**: 如 1.1 所述，`getCragById`、`getAllCrags`、`getAllRoutes` 等数据库查询函数未使用 `React.cache()` 包裹。在同一次 Server Component 渲染中（如 `generateMetadata` + `Page`），可能会重复查询。

**修复建议**: 将所有常用的数据库查询函数用 `React.cache()` 包裹：

```tsx
import { cache } from 'react'
export const getAllCrags = cache(async () => { /* ... */ })
export const getCragById = cache(async (id: string) => { /* ... */ })
export const getRoutesByCragId = cache(async (cragId: string) => { /* ... */ })
```

### 3.2 首页传输所有线路数据而非按岩场分组（`server-serialization`）

**文件**: `src/app/[locale]/page.tsx:19-29` → `home-client.tsx:39-48`

**问题**: 首页获取 `getAllRoutes()` 并传输全部线路到客户端，然后在客户端用 `useMemo` 按 `cityId` 和 `cragId` 筛选。当线路总数增长时，RSC payload 线性增长。

**影响**: 当前线路数量较少，影响不大。但若线路数增长到 500+，payload 会显著增加。

**建议**（未来优化）: 可以在服务端按当前城市预过滤，或使用 `Map<cragId, Route[]>` 数据结构在服务端构建好分组：

```tsx
// 按 cragId 分组，避免客户端 O(n*m) 的 inline filter
const routesByCrag = new Map<string, Route[]>()
lightRoutes.forEach(r => {
  const arr = routesByCrag.get(r.cragId) || []
  arr.push(r)
  routesByCrag.set(r.cragId, arr)
})
```

---

## 4. 客户端数据获取 — MEDIUM-HIGH

### 4.1 `useWeather` 缺少请求去重和缓存（`client-swr-dedup`）

**文件**: `src/hooks/use-weather.ts`

**问题**: `useWeather` 使用原始 `fetch` + `useState` + `useEffect`，不具备：
- **请求去重**: 首页的 `WeatherStrip` 和 `CragCard`（通过 `WeatherBadge`）可能使用相同的 adcode 分别调用天气 API
- **背景重验证**: 用户切换页面再回来时，天气数据不会自动刷新
- **跨组件缓存共享**: 从首页导航到岩场详情页后，相同的天气数据会重新请求

**修复建议**: 使用 SWR 替换：

```tsx
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useWeather({ adcode, coordinates, forecast = true }: UseWeatherOptions = {}) {
  const params = new URLSearchParams()
  if (adcode) params.set('adcode', adcode)
  else if (coordinates) {
    params.set('lng', String(coordinates.lng))
    params.set('lat', String(coordinates.lat))
  }
  if (!forecast) params.set('forecast', 'false')

  const key = params.toString() ? `/api/weather?${params}` : null

  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,  // 1 分钟内去重
  })

  return {
    weather: data as WeatherData | null,
    loading: isLoading,
    error: !!error,
  }
}
```

### 4.2 `useCragRoutes` 编辑器数据缺少缓存（`client-swr-dedup`）

**文件**: `src/hooks/use-crag-routes.ts`

**问题**: 每次编辑器页面切换（faces → routes → betas），`useCragRoutes` 都会重新请求 `/api/crags` 和 `/api/crags/{id}/routes`。三个编辑器页面各自维护独立的数据副本。

**修复建议**: 使用 SWR 实现跨页面缓存共享，或使用 React Context 在编辑器布局层共享数据。

### 4.3 天气 API 首页双重请求（`client-event-listeners` 变体）

**文件**: `src/app/[locale]/home-client.tsx:51` + `src/components/weather-strip.tsx`

**问题**: 首页中 `HomePageClient` 调用 `useWeather({ adcode, forecast: false })` 用于 `CragCard` 的天气角标，同时 `WeatherStrip` 也调用 `useWeather({ adcode })` 获取实况天气。两次请求参数仅 `forecast` 不同，但都会独立发出请求。

**修复建议**:
- 方案 A: 统一为一次请求（含预报），在各组件中选择需要的字段
- 方案 B: 采用 SWR 后自动去重（如 4.1 所述）

---

## 5. 重渲染优化 — MEDIUM

### 5.1 首页岩场卡片的内联 `.filter()` 每次渲染重建（`rerender-memo`）

**文件**: `src/app/[locale]/home-client.tsx:108`

**问题**:

```tsx
{filteredCrags.map((crag, index) => (
  <CragCard
    routes={(filteredRoutes || []).filter((r) => r.cragId === crag.id)}
    ...
  />
))}
```

`routes` prop 每次渲染都会创建新数组引用（`.filter()` 返回新数组），即使数据没有变化。如果 `CragCard` 使用 `React.memo()`，这会使 memo 失效。

**修复建议**: 预计算按 cragId 分组的 Map：

```tsx
const routesByCrag = useMemo(() => {
  const map = new Map<string, Route[]>()
  filteredRoutes.forEach(r => {
    const arr = map.get(r.cragId) || []
    arr.push(r)
    map.set(r.cragId, arr)
  })
  return map
}, [filteredRoutes])

// 渲染时
<CragCard routes={routesByCrag.get(crag.id) || EMPTY_ROUTES} />
```

### 5.2 编辑器 leftPanel/rightPanel 是 JSX 变量而非组件（`rerender-memo`）

**文件**: `src/app/[locale]/editor/faces/page.tsx:452-915`、`routes/page.tsx:558-1136`

**问题**: `leftPanel` 和 `rightPanel` 定义为 JSX 变量（`const leftPanel = (<div>...</div>)`），不是独立的 React 组件。这意味着：
1. 任何 state 变化（无论是左栏还是右栏的）都会重新计算两个 panel 的 JSX
2. 无法对它们应用 `React.memo()` 优化

**修复建议**: 抽取为独立组件，通过 props 传递必要数据：

```tsx
const LeftPanel = React.memo(function LeftPanel({ ... }: LeftPanelProps) {
  // ...
})

const RightPanel = React.memo(function RightPanel({ ... }: RightPanelProps) {
  // ...
})
```

### 5.3 编辑器 20-30 个 useState 导致耦合重渲染（`rerender-derived-state`）

**文件**: `src/app/[locale]/editor/faces/page.tsx:87-117`

**问题**: `FaceManagementPage` 有 20 个 `useState`，许多状态之间存在逻辑分组关系：
- 选择状态: `selectedArea`, `selectedFace`, `mobileShowDetail`
- 新建状态: `isCreating`, `newFaceId`, `newArea`, `faceFormErrors`
- 上传状态: `uploadedFile`, `previewUrl`, `isDragging`, `isUploading`, `showOverwriteConfirm`, `clearTopoOnUpload`, `compressionProgress`
- 删除/重命名状态: `showDeleteConfirm`, `isDeleting`, `isRenaming`, `renameValue`, `isSubmittingRename`

任何一个 state 变化都会触发整个组件（含所有子 JSX）重渲染。

**修复建议**: 使用 `useReducer` 或将相关状态分组到自定义 hook：

```tsx
function useUploadState() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  // ... handlers
  return { uploadedFile, previewUrl, isDragging, isUploading, ... }
}
```

### 5.4 CragDetailClient 中 `grades` 排序在每次渲染重复计算（`rerender-lazy-state-init` 变体）

**文件**: `src/app/[locale]/crag/[id]/crag-detail-client.tsx:71-85`

**问题**: `grades` 和 `gradeRange` 的计算不在 `useMemo` 中，每次渲染（如滚动触发 `setCurrentIndex`、`setImageVisible`）都会重新执行 `.map().filter().sort()` 链。

**修复建议**:

```tsx
const gradeRange = useMemo(() => {
  const grades = routes
    .map((r) => r.grade)
    .filter((g) => g !== '？')
    .sort((a, b) => parseInt(a.replace('V', '')) - parseInt(b.replace('V', '')))
  if (grades.length === 0) return '暂无'
  return grades[0] === grades[grades.length - 1]
    ? grades[0]
    : `${grades[0]} - ${grades[grades.length - 1]}`
}, [routes])
```

---

## 6. 渲染性能 — MEDIUM

### 6.1 线路列表缺少虚拟化或 `content-visibility`（`rendering-content-visibility`）

**文件**: `src/app/[locale]/route/route-client.tsx:268-318`

**问题**: 线路列表直接渲染所有 `filteredRoutes`。当线路数达到 100+，DOM 节点较多，尤其在移动端滚动时可能掉帧。

**修复建议**: 使用 CSS `content-visibility: auto` 作为最低成本优化：

```css
.route-card {
  content-visibility: auto;
  contain-intrinsic-size: 0 72px; /* 估算卡片高度 */
}
```

### 6.2 入场动画逐个延迟影响首屏（`rendering-*`）

**文件**: `src/app/[locale]/route/route-client.tsx:275-281`

**问题**:

```tsx
className={`... ${!hasInitialRender ? 'animate-fade-in-up' : ''}`}
style={{ ...(hasInitialRender ? {} : { animationDelay: `${index * 30}ms` }) }}
```

每个线路卡片有递增的 `animationDelay`，如果有 50 条线路，最后一个卡片延迟 1500ms 才完成动画。在低端设备上同时运行 50 个 CSS 动画可能导致掉帧。

**修复建议**: 限制动画数量（如仅前 10 个卡片有动画），其余直接显示：

```tsx
const MAX_ANIMATED = 10
style={{
  ...(hasInitialRender || index >= MAX_ANIMATED
    ? {}
    : { animationDelay: `${index * 30}ms` })
}}
```

### 6.3 FaceThumbnail 组件在列表中重复创建（`rendering-hoist-jsx`）

**文件**: `src/app/[locale]/editor/faces/page.tsx:46-73`

**问题**: `FaceThumbnail` 在岩面列表中使用 `useState` 管理加载状态，这本身是好的。但在移动端缩略图横向滚动条中（第 957-996 行），每个缩略图都通过 `key={face.faceId}` 重新挂载。当用户在 leftPanel 和 detail 间切换时，所有 `FaceThumbnail` 都会重新加载。

**修复建议**: 考虑用 CSS `loading="lazy"` 属性替代 JS 加载状态管理。

---

## 7. JavaScript 性能 — LOW-MEDIUM

### 7.1 正则表达式未提升到模块级（`js-hoist-regexp`）

**文件**: `src/app/[locale]/editor/faces/page.tsx:321,402`

**问题**: 校验正则 `/^[\u4e00-\u9fffa-z0-9-]+$/` 在 `handleUpload` 和 `handleRenameFace` 回调中内联创建。虽然 V8 会缓存字面量正则，但提升到模块级更清晰。

**修复建议**:

```tsx
const FACE_ID_PATTERN = /^[\u4e00-\u9fffa-z0-9-]+$/
```

### 7.2 线路列表多次筛选可合并为单次遍历（`js-combine-iterations`）

**文件**: `src/app/[locale]/route/route-client.tsx:193-222`

**问题**: `filteredRoutes` 中有最多 4 次 `.filter()` + 1 次 `.sort()`。在线路数量大时，这是多次完整遍历。

**修复建议**: 合并为单次循环：

```tsx
const filteredRoutes = useMemo(() => {
  const allGrades = selectedGrades.length > 0 ? getGradesByValues(selectedGrades) : null
  const query = searchQuery.trim() || null

  const result: Route[] = []
  for (const r of routes) {
    if (selectedCrag && r.cragId !== selectedCrag) continue
    if (selectedFace && (r.faceId || `${r.cragId}:${r.area}`) !== selectedFace) continue
    if (allGrades && !allGrades.includes(r.grade)) continue
    if (query && !matchRouteByQuery(r, query)) continue
    result.push(r)
  }
  // sort 保留不变
  return result.sort(...)
}, [...])
```

### 7.3 `CRAG_COORDINATES` 硬编码在组件文件中（`js-cache-property-access` 变体）

**文件**: `src/app/[locale]/crag/[id]/crag-detail-client.tsx:16-21`

**问题**: 坐标映射表硬编码在客户端组件文件中，且重复使用 `CRAG_COORDINATES[crag.id] || CRAG_COORDINATES.default` 模式（出现 2 次）。

**修复建议**: 移到 `src/lib/constants.ts` 或 `city-config.ts` 中统一管理。在服务端 `page.tsx` 中 resolve 好坐标后传给客户端，避免硬编码：

```tsx
// page.tsx (server)
const coordinates = crag.coordinates || CRAG_COORDINATES[crag.id] || DEFAULT_COORDS
return <CragDetailClient crag={crag} routes={routes} coordinates={coordinates} />
```

---

## 8. 高级模式 — LOW

### 8.1 `useWeather` 无稳定回调引用（`advanced-use-latest` 变体）

**文件**: `src/hooks/use-weather.ts`

**问题**: `useEffect` 的依赖包含 `coordinates?.lng` 和 `coordinates?.lat`。如果父组件每次渲染传入新的 `coordinates` 对象引用（即使值相同），会触发不必要的重新请求。

**示例**: `CragDetailClient` 中 `CRAG_COORDINATES[crag.id] || CRAG_COORDINATES.default` 每次渲染返回同一对象引用（因为是模块级常量），不会触发。但 `WeatherCard` 的 `coordinates={crag.coordinates || ...}` 中 `crag.coordinates` 如果是每次反序列化创建的新对象，则会触发。

**修复建议**: 在 `useWeather` 中使用独立的 `lng`/`lat` 作为 effect 依赖（已经这样做了 ✅），这条实际影响较小。

---

## 改进优先级建议

### Phase 1: 快速收益（1-2 天）
1. ✅ 为数据库查询函数添加 `React.cache()` (3.1)
2. ✅ 线路列表页 `route/page.tsx` 添加 `lightRoutes` 裁剪 (2.3)
3. ✅ 首页 `routesByCrag` Map 预计算 (5.1)
4. ✅ `gradeRange` 加 `useMemo` (5.4)
5. ✅ 正则表达式提升到模块级 (7.1)

### Phase 2: 中等工作量（3-5 天）
6. 🔄 `useWeather` 改用 SWR (4.1)
7. 🔄 编辑器页面并行加载 routes + faces (1.2)
8. 🔄 `BetaListDrawer`/`BetaSubmitDrawer` 动态导入 (2.2)
9. 🔄 线路列表添加 `content-visibility` (6.1)
10. 🔄 线路入场动画限制数量 (6.2)

### Phase 3: 大重构（1-2 周）
11. 📋 编辑器页面拆分子组件 + React.memo (2.1, 5.2)
12. 📋 编辑器状态分组为自定义 hooks (5.3)
13. 📋 `useCragRoutes` 改用 SWR 跨页面缓存 (4.2)
14. 📋 高德地图视口内延迟加载 (2.4)

---

## 附录：规则覆盖映射

| 规则 ID | 规则名称 | 项目现状 |
|---------|---------|---------|
| `async-parallel` | Promise.all() 并行 | ✅ 页面层已做，❌ 编辑器层未做 |
| `async-suspense-boundaries` | Suspense 边界 | ✅ 故意不用（ISR 优化，有注释说明） |
| `bundle-barrel-imports` | 避免 barrel 文件 | ✅ 无问题 |
| `bundle-dynamic-imports` | 动态导入 | ⚠️ 编辑器对话框未动态导入 |
| `bundle-defer-third-party` | 延迟三方库 | ⚠️ 地图 SDK 可优化 |
| `bundle-conditional` | 按需加载 | ⚠️ Beta 抽屉可延迟 |
| `server-cache-react` | React.cache() | ❌ 未使用 |
| `server-serialization` | 最小化客户端数据 | ⚠️ 首页已做，线路列表页未做 |
| `client-swr-dedup` | SWR 请求去重 | ❌ 全部使用原始 fetch |
| `rerender-memo` | 提取昂贵 memo | ⚠️ 部分做了，编辑器未做 |
| `rerender-derived-state` | 派生状态订阅 | ⚠️ 编辑器状态过多 |
| `rendering-content-visibility` | 内容可见性 | ❌ 未使用 |
| `rendering-conditional-render` | 条件渲染 | ✅ 大部分正确 |
| `js-combine-iterations` | 合并迭代 | ⚠️ 线路筛选可优化 |
| `js-hoist-regexp` | 提升正则 | ⚠️ 编辑器中可优化 |
| `js-set-map-lookups` | Set/Map 查找 | ⚠️ 首页可优化 |
