# 地级市聚合浏览岩场

## 需求

首页城市选择器支持双层选择：
- 点击地级市（如「福州」）→ 展示该地级市下所有区/县的岩场，按区/县分组
- 点击区/县（如「罗源」）→ 展示该区/县的岩场（现有行为）

## 核心类型

```typescript
type CitySelection =
  | { type: 'city'; id: string }         // 区/县级
  | { type: 'prefecture'; id: string }   // 地级市级
```

localStorage + cookie 存储 JSON 字符串。向后兼容旧的纯字符串值。

## 数据获取

```
page.tsx → parseCitySelection(cookie)
  ├── type: 'prefecture' → getCragsByPrefectureId(id)
  │   └── 查 prefectures.districts → crags.find({ cityId: { $in: districts } })
  └── type: 'city' → getCragsByCityId(id)  (不变)
```

## 客户端展示

地级市模式下，home-client 按 `crag.cityId` 分组，每组前显示区/县名标题。

## 城市选择器交互

多区地级市行分为两个操作区域：
- 左侧（名称区）点击 → 选中地级市全部 `{ type: 'prefecture', id }`
- 右侧（箭头）点击 → 展开/收起子列表

单区地级市点击 → 直接选中 `{ type: 'city', id }`。

## Hook 改造

`useCitySelection` 返回 `selection: CitySelection` + `setSelection()`。
保留 `cityId` 兼容字段（地级市时取 `defaultDistrict`）。

## 文件变更

| 文件 | 改动 |
|------|------|
| `src/types/index.ts` | 新增 `CitySelection` 类型 |
| `src/lib/db/index.ts` | 新增 `getCragsByPrefectureId`、`getRoutesByPrefectureId` |
| `src/lib/city-utils.ts` | 新增 `parseCitySelection`、`serializeCitySelection` |
| `src/hooks/use-city-selection.ts` | 返回 `selection` + localStorage JSON 迁移 |
| `src/app/[locale]/page.tsx` | 分支查询逻辑 |
| `src/app/[locale]/home-client.tsx` | 地级市分组渲染 |
| `src/components/city-selector.tsx` | 双操作区域 UI |
