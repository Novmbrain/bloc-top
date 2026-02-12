# 坐标精度控制 + GCJ-02/WGS-84 双向转换

## 背景

- 高德地图 API 要求坐标精度不超过 6 位小数（≈0.11m）
- 现有岩场坐标硬编码在 `crag-detail-client.tsx` 的 `CRAG_COORDINATES` 字典中，不在 DB
- 精度不一致：圆通寺 14 位、八井村 5 位、默认 4 位
- 无坐标系标注，实际为 GCJ-02（从高德拾取/导航 URL 声明 `coordinate=gaode`）
- 编辑器无精度验证、无坐标系转换

## 架构决策

**DB 统一存储 WGS-84（GPS 国际标准坐标）**

理由：
- WGS-84 是国际通用标准（Google Maps、Apple Maps、OpenStreetMap 均使用）
- 如果未来接入非中国地图服务，数据无需再转换
- 转换是确定性的，不丢失精度

## 数据流

```
编辑器输入
  ├── 选择 "WGS-84 / GPS"    → 截断 6 位 → 直接存 DB
  └── 选择 "GCJ-02 / 高德"   → gcj02ToWgs84() → 截断 6 位 → 存 DB

DB (WGS-84) → 消费端
  ├── AMap 地图组件  → wgs84ToGcj02() → 传给 AMap JS API
  ├── AMap 导航 URL  → wgs84ToGcj02() → coordinate=gaode
  └── 天气 API       → 使用 adcode（不受影响）
```

## 实现

### 1. `src/lib/coordinate-utils.ts` (新建)

```typescript
// GCJ-02 偏移参数
const A = 6378245.0        // 长半轴
const EE = 0.00669342162296594  // 偏心率平方

// 核心转换
export function wgs84ToGcj02(coords: Coordinates): Coordinates
export function gcj02ToWgs84(coords: Coordinates): Coordinates  // 迭代逼近法

// 精度控制
export function truncateCoordinates(coords: Coordinates, precision?: number): Coordinates
// 默认 precision = 6

// 验证
export function validateCoordinates(coords: Coordinates): { valid: boolean; error?: string }
// 中国范围: 73-136°E, 3-54°N

// 格式化显示
export function formatCoordinate(value: number, precision?: number): string
```

### 2. `src/lib/coordinate-utils.test.ts` (新建)

测试用例：
- 已知坐标对的正反向转换精度（<1m 误差）
- truncateCoordinates 精度截断
- validateCoordinates 边界检测
- 中国境外坐标不做偏移（outOfChina 判断）

### 3. `src/components/amap-container.tsx` (修改)

```diff
+ import { wgs84ToGcj02 } from '@/lib/coordinate-utils'

// 使用前转换
- center: [center.lng, center.lat]
+ const gcj02 = wgs84ToGcj02(center)
+ center: [gcj02.lng, gcj02.lat]
```

导航 URL 同步修改。

### 4. `src/app/[locale]/crag/[id]/crag-detail-client.tsx` (修改)

- 将 `CRAG_COORDINATES` 中的现有 GCJ-02 坐标转换为 WGS-84
- 或者更好：删除 `CRAG_COORDINATES` 字典，改为在 seed 中写入 DB

### 5. 编辑器页面 (修改)

`editor/crags/[id]/page.tsx` + `editor/cities/page.tsx`：

- 坐标输入增加坐标系选择 toggle（WGS-84 / GCJ-02）
- placeholder 改为 6 位小数示例
- step 改为 0.000001
- 提示文字说明坐标系和精度要求
- 保存时根据选择的坐标系做转换 + 截断

### 6. `scripts/seed.ts` (修改)

为 yuan-tong-si 和 ba-jing-cun 添加 coordinates 字段（WGS-84 值）。

### 7. 现有数据迁移

将 `CRAG_COORDINATES` 中的 GCJ-02 坐标通过 `gcj02ToWgs84()` 转换后，
通过 seed 或 API 写入两个岩场的 DB 记录。完成后删除 `CRAG_COORDINATES` 字典。

## 文件变更

| 文件 | 操作 |
|------|------|
| `src/lib/coordinate-utils.ts` | **新建** |
| `src/lib/coordinate-utils.test.ts` | **新建** |
| `src/components/amap-container.tsx` | 修改 — 加入 wgs84ToGcj02 转换 |
| `src/app/[locale]/crag/[id]/crag-detail-client.tsx` | 修改 — 删除 CRAG_COORDINATES |
| `src/app/[locale]/editor/crags/[id]/page.tsx` | 修改 — 坐标系选择 + 精度控制 |
| `src/app/[locale]/editor/cities/page.tsx` | 修改 — 坐标系选择 + 精度控制 |
| `scripts/seed.ts` | 修改 — 添加岩场坐标（WGS-84） |

**总计**: 新建 2 文件，修改 5 文件

## 不做的事情

- 不建 API 代理路由（纯本地算法，无需网络调用）
- 不迁移城市坐标（城市坐标仅用于天气 API 的 adcode 查询，不影响地图）
- 不添加地图拾取功能
