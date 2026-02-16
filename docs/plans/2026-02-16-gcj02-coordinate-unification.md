# GCJ-02 坐标统一化设计

日期: 2026-02-16

## 背景

当前坐标体系存在不一致：
- **设计意图**: DB 存 WGS-84，渲染时转 GCJ-02
- **实际情况**: Editor 岩场页保存坐标时**没有转换**，城市页**有转换**，DB 中坐标系混乱
- **用户工作流**: 从高德坐标拾取器 (`lbs.amap.com/tools/picker`) 复制 GCJ-02 坐标

## 决策

**统一使用 GCJ-02 (火星坐标系) 存储**。移除所有 WGS-84 转换逻辑。

理由：
1. 唯一的坐标输入源是高德拾取器 (GCJ-02)
2. 唯一的地图渲染目标是高德地图 JS API (需要 GCJ-02)
3. 数据量小 (3 城市 + 4 岩场)，手动迁移成本低
4. 消除隐式转换，减少出错风险

## 变更范围

### 1. Editor 岩场坐标输入 (核心改动)

**文件**: `apps/editor/src/app/crags/[id]/page.tsx`

- 两个 `<input type="number">` → 单行文本输入框
- 支持粘贴格式: `119.306239,26.063477` (逗号分隔，可有空格)
- 标注 "GCJ-02 火星坐标系"
- 提供 "打开高德坐标拾取器" 外链
- `EditForm` 字段: `lng: string` + `lat: string` → `coordinateInput: string`
- 保存时解析为 `{ lng, lat }` 存入 DB

### 2. Editor 城市坐标输入

**文件**: `apps/editor/src/app/cities/page.tsx`

- 移除 `gcj02ToWgs84()` 转换，直接存用户输入
- 坐标输入改为同样的单行粘贴模式

### 3. PWA 地图组件

**文件**: `apps/pwa/src/components/amap-container.tsx`

- 移除 `wgs84ToGcj02()` 调用
- 直接使用 `center` 坐标传给高德地图 (已是 GCJ-02)
- `approachPaths` 坐标同样直接使用

### 4. coordinate-utils 重构

**删除**: `apps/pwa/src/lib/coordinate-utils.ts`, `apps/editor/src/lib/coordinate-utils.ts`
**新增**: `packages/shared/src/coordinate-utils.ts`

保留函数:
- `validateCoordinates(coords)` — 验证合法性 + 中国范围检查
- `truncateCoordinates(coords, precision)` — 精度截断
- `formatCoordinate(value, precision)` — 格式化
- `parseCoordinateInput(input: string)` — 新增，解析粘贴字符串

删除函数:
- `wgs84ToGcj02()` — 不再需要
- `gcj02ToWgs84()` — 不再需要
- `outOfChina()` — 内部函数，随转换一起删除
- `calcOffset()` — 内部函数，随转换一起删除

### 5. 更新测试

- `apps/pwa/src/lib/coordinate-utils.test.ts` — 移除转换测试，改为导入 shared
- 新增 `packages/shared/src/coordinate-utils.test.ts` — 验证 + 解析测试

## 数据迁移

**不写脚本**，手动通过 Editor 重新输入：
1. 先部署代码变更
2. 通过高德拾取器获取正确的 GCJ-02 坐标
3. 在 Editor 中更新 3 个城市 + 4 个岩场的坐标

## 不受影响的部分

- `Coordinates` 接口 (`{ lng, lat }`) — 结构不变，语义从 WGS-84 改为 GCJ-02
- API 路由 — 透传坐标，不做转换
- 天气 API — 使用 adcode 查询，不依赖坐标
- IP 定位 — 使用 adcode 匹配，不依赖坐标
