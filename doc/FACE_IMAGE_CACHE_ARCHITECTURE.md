# 岩面图片统一缓存层架构

> **状态**: 已实现 (URL 版本化方案)
> **实现时间**: 2026-02-04

---

## 架构概览

统一的岩面图片缓存层，基于 **URL 版本化** 方案（非 Blob URL），与 Next.js `<Image>` 和 Service Worker `CacheFirst` 策略完全兼容。

### 设计决策

选择 URL 版本化而非 Blob URL 的原因：
1. **Next.js 兼容**: Blob URL 无法通过 `remotePatterns` 验证，`<Image>` 组件会拒绝加载
2. **零内存管理**: 无需 `URL.revokeObjectURL()`，无泄漏风险
3. **SW 协同**: 版本变化 → URL 变化 → SW 视为新请求 → 从网络获取，天然绕过缓存

### 缓存层级

```
┌──────────────────────────────────────────────────┐
│  FaceImageCacheService (React 层)                 │
│  ├─ 版本追踪: Map<FaceKey, timestamp>             │
│  ├─ 事件订阅: subscribe / subscribeByPrefix       │
│  └─ URL 生成: ?v=<静态版本> 或 ?t=<时间戳>         │
└──────────────────────────────────────────────────┘
                       ↓ 生成的 URL 交给浏览器/SW
┌──────────────────────────────────────────────────┐
│  Service Worker (sw.ts)                           │
│  ├─ OfflineFirstImageStrategy                     │
│  ├─ CacheFirst (1年 TTL, 200张上限)               │
│  └─ 新 URL (?t=xxx) → 未命中 → 网络请求           │
└──────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│  CDN (Cloudflare R2)                              │
│  └─ img.bouldering.top                           │
└──────────────────────────────────────────────────┘
```

---

## 文件结构

```
src/lib/face-image-cache/
├── types.ts              # FaceKey, ImageSource, FaceImageStatus, UseFaceImageResult
├── cache-service.ts      # 核心缓存服务 (版本管理 + 事件订阅)
├── cache-service.test.ts # 21 个单元测试
└── index.ts              # 公共 API 导出

src/hooks/
└── use-face-image.ts     # useFaceImage (状态管理) + useFaceImageCache (服务实例)

src/components/
└── face-image-provider.tsx  # FaceImageCacheContext + FaceImageProvider
```

---

## 核心 API

### FaceImageCacheService

```typescript
class FaceImageCacheService {
  static getFaceKey(source: ImageSource): FaceKey | null
  getImageUrl(source: ImageSource): string
  invalidate(faceKey: FaceKey): void
  invalidateByPrefix(prefix: string): void
  prefetch(urls: string[]): void
  subscribe(faceKey: FaceKey, cb: () => void): () => void
  subscribeByPrefix(prefix: string, cb: () => void): () => void
}
```

### Hooks

```typescript
// 单图片状态管理 (RouteDetailDrawer)
useFaceImage(source: ImageSource | null): UseFaceImageResult

// 缓存服务实例 (URL 生成 + CRUD 失效)
useFaceImageCache(): FaceImageCacheService  // 始终非 null
```

---

## 数据流

### 正常渲染

```
组件 → useFaceImage(route) → cache.getImageUrl(route)
  → getTopoImageUrl(route) → URL 带 ?v=<IMAGE_VERSION>
  → <Image src={url} onLoad={onLoad} onError={onError} />
```

### CRUD 后刷新

```
Editor 上传/删除/重命名
  ↓ cache.invalidate("cragId/area/faceId")
  ↓ versions.set(key, Date.now())
  ↓ notify(key)
  ├─→ 精确订阅者 (useFaceImage)
  │   → setRenderKey++ → src 重算 → URL 带 ?t=<timestamp> → SW 缓存 miss → 网络请求
  └─→ 前缀订阅者 (FaceThumbnailStrip)
      → setCacheVersion++ → useMemo 重算 → 所有缩略图 URL 更新
```

---

## 消费者集成

| 组件 | 集成方式 | 订阅类型 |
|------|---------|---------|
| `route-detail-drawer.tsx` | `useFaceImage(route)` | 精确订阅 |
| `face-thumbnail-strip.tsx` | `useFaceImageCache()` + `subscribeByPrefix` | 前缀订阅 |
| `editor/faces/page.tsx` | `useFaceImageCache()` + `invalidate()` | 生产者 (CRUD) |
| `editor/routes/page.tsx` | `useFaceImageCache()` + `getImageUrl()` | URL 生成 |

---

## 关键模式

### 渲染期状态调整 (非 useEffect)

`useFaceImage` 在 URL 变化时重置加载状态，使用 React 官方推荐的 "render-time state adjustment" 模式：

```typescript
const prevSrcRef = useRef<string | null>(null)
if (src !== prevSrcRef.current) {
  prevSrcRef.current = src
  if (status !== nextStatus) setStatus(nextStatus)
}
```

这避免了 `react-hooks/set-state-in-effect` ESLint 错误，同时保证状态与 URL 同步。

### 非 null Context 默认值

`FaceImageCacheContext` 使用 `defaultCache` 单例作为默认值，使 `useFaceImageCache()` 始终返回非 null 实例，消除所有消费者的 null 检查。

---

*实现完成: 2026-02-04*
