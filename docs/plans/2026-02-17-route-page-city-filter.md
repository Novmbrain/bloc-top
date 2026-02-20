# Route Page City Filter — Design

**Date**: 2026-02-17
**Status**: Approved

## Problem

线路页面 (`/route`) 加载全部岩场和线路数据，不跟随首页的城市选择。用户在首页选择「福州 → 罗源」后进入线路页面，看到的是所有城市的数据。

## Solution

线路页面 Server Component 读取 `city` cookie，复用首页的城市解析逻辑，只从数据库获取该城市/地级市的岩场和线路。

### Changes

1. **`route/page.tsx`**: 添加 cookie 读取 + 按城市/地级市过滤查询
2. **`route-client.tsx`**: 移除客户端城市过滤逻辑（`selectedCity`, `cityFilteredCrags`, `cityFilteredRoutes`）
3. **`filter-constants.ts`**: 可选移除 `CITY` 参数

### Data Flow

```
Cookie: city={"type":"city","id":"luoyuan"}
  → route/page.tsx reads cookie
  → getCragsByCityId("luoyuan") / getCragsByPrefectureId("fuzhou")
  → pass filtered data to route-client.tsx
  → client uses data directly (no city filter needed)
```
