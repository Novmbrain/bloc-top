# Offline Stale Detection — 离线岩场增量更新提示

## 问题

用户下载岩场后，如果后台新增了线路，离线功能仍然显示"已完成"，用户无法感知有新数据。

## 设计决策

| 决策 | 选择 |
|------|------|
| 检测时机 | App 启动时后台异步检查 |
| 响应策略 | 仅提示，用户手动更新 |
| 检测方式 | 新建轻量级 API `/api/crags/[id]/version` |
| UI 展示 | 下载按钮变色 (amber + RefreshCw 图标) |
| 更新方式 | 复用完整下载流程 (全量覆盖) |

## 变更清单

### 1. 类型 — `src/types/index.ts`

```typescript
// DownloadStatus 新增 'stale'
type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'failed' | 'stale'
```

### 2. API — `src/app/api/crags/[id]/version/route.ts`

```
GET /api/crags/[id]/version → { routeCount: number }
```

使用 `countDocuments({ cragId })` 只返回线路数量。

### 3. 存储 — `src/lib/offline-storage.ts`

Meta 新增字段：

```typescript
interface OfflineCragsMeta.crags[id] {
  // ... 现有字段
  serverRouteCount?: number  // 服务端线路数
  lastChecked?: string       // 上次检查时间 (ISO)
}
```

判定：`isStale = serverRouteCount != null && serverRouteCount > routeCount`

### 4. Provider — `src/components/offline-download-provider.tsx`

- 启动时 useEffect 触发 `checkForUpdates()`
- 30 分钟最小检查间隔 (基于 `lastChecked`)
- 网络失败静默忽略
- 暴露 `getUpdateInfo(cragId)` 方法

### 5. UI — `src/components/download-button.tsx`

| 状态 | 图标 | 颜色 | 交互 |
|------|------|------|------|
| `stale` | `RefreshCw` | warning/amber | 点击 → 全量重新下载 |

更新完成后 routeCount 对齐 → stale 自动消除。
