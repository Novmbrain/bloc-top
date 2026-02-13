# Plan: 修复天气模块客户端翻译映射 (方案 A: `t()` 翻译)

> 基于 `doc/data-flow/WEATHER_CACHE_I18N_ANALYSIS.md` 第 5 节方案 A

## 问题总结

高德天气 API 返回的 `live.weather`（天气描述）和 `live.windDirection`（风向）始终是中文，
切换到 en/fr 时这些字段直接显示中文，造成混合语言 UI。

具体位置：
- `weather-strip.tsx:89` — `· {live.weather}` 直接显示中文天气
- `weather-card.tsx:106` — `{live.weather}` 直接显示中文天气
- `weather-card.tsx:126` — `windValue` 模板中的 `direction` 参数始终中文

## 实现步骤

### Step 1: 添加翻译条目 (messages/*.json)

在三个 locale 文件的 `Weather` 命名空间下新增 `weatherDesc` 和 `windDir` 两个嵌套对象。

**`messages/zh.json`** — 中文保持原值（AMap API 返回什么就是什么）：
```json
"weatherDesc": {
  "晴": "晴", "少云": "少云", "晴间多云": "晴间多云", "多云": "多云",
  "阴": "阴", "阵雨": "阵雨", "雷阵雨": "雷阵雨", "小雨": "小雨",
  "中雨": "中雨", "大雨": "大雨", "暴雨": "暴雨", "雨夹雪": "雨夹雪",
  "小雪": "小雪", "中雪": "中雪", "大雪": "大雪", "雾": "雾", "霾": "霾"
},
"windDir": {
  "北": "北", "东北": "东北", "东": "东", "东南": "东南",
  "南": "南", "西南": "西南", "西": "西", "西北": "西北"
}
```

**`messages/en.json`**：
```json
"weatherDesc": {
  "晴": "Sunny", "少云": "Few Clouds", "晴间多云": "Partly Cloudy", "多云": "Cloudy",
  "阴": "Overcast", "阵雨": "Showers", "雷阵雨": "Thunderstorm", "小雨": "Light Rain",
  "中雨": "Moderate Rain", "大雨": "Heavy Rain", "暴雨": "Rainstorm", "雨夹雪": "Sleet",
  "小雪": "Light Snow", "中雪": "Moderate Snow", "大雪": "Heavy Snow", "雾": "Foggy", "霾": "Hazy"
},
"windDir": {
  "北": "N", "东北": "NE", "东": "E", "东南": "SE",
  "南": "S", "西南": "SW", "西": "W", "西北": "NW"
}
```

**`messages/fr.json`**：
```json
"weatherDesc": {
  "晴": "Ensoleillé", "少云": "Peu nuageux", "晴间多云": "Partiellement nuageux", "多云": "Nuageux",
  "阴": "Couvert", "阵雨": "Averses", "雷阵雨": "Orage", "小雨": "Pluie légère",
  "中雨": "Pluie modérée", "大雨": "Forte pluie", "暴雨": "Tempête de pluie", "雨夹雪": "Pluie verglaçante",
  "小雪": "Neige légère", "中雪": "Neige modérée", "大雪": "Forte neige", "雾": "Brouillard", "霾": "Brumeux"
},
"windDir": {
  "北": "N", "东北": "NE", "东": "E", "东南": "SE",
  "南": "S", "西南": "SO", "西": "O", "西北": "NO"
}
```

覆盖范围说明：只翻译常见天气（约 17 种），其余罕见天气（大暴雨、特大暴雨、龙卷风等）回退显示原始中文。
风向覆盖全部 8 个方位。

### Step 2: 创建翻译辅助函数 (weather-utils.ts)

在 `src/lib/weather-utils.ts` 中新增两个辅助函数，供组件使用：

```typescript
/**
 * 翻译天气描述 (高德 API 中文 → 当前 locale)
 * 使用 next-intl 的 t.has() 检查翻译是否存在，不存在则回退原始中文
 */
export function translateWeather(
  t: { has: (key: string) => boolean; (key: string): string },
  weather: string
): string {
  const key = `weatherDesc.${weather}`
  return t.has(key) ? t(key) : weather
}

/**
 * 翻译风向 (高德 API 中文 → 当前 locale)
 */
export function translateWindDirection(
  t: { has: (key: string) => boolean; (key: string): string },
  direction: string
): string {
  const key = `windDir.${direction}`
  return t.has(key) ? t(key) : direction
}
```

使用 `t.has()` 做安全回退的理由：
- 高德 API 可能返回翻译表中未覆盖的罕见天气描述
- 避免 next-intl 对缺失 key 抛出警告/错误
- 未翻译时显示中文原文比显示 key 路径好得多

### Step 3: 更新 WeatherStrip 组件

`src/components/weather-strip.tsx:89`：

```tsx
// Before
· {live.weather}

// After
· {translateWeather(t, live.weather)}
```

添加 import: `import { translateWeather } from '@/lib/weather-utils'`

### Step 4: 更新 WeatherCard 组件

`src/components/weather-card.tsx:106`：

```tsx
// Before
{live.weather}

// After
{translateWeather(t, live.weather)}
```

`src/components/weather-card.tsx:126`：

```tsx
// Before
{t('windValue', { direction: live.windDirection, power: live.windPower })}

// After
{t('windValue', { direction: translateWindDirection(t, live.windDirection), power: live.windPower })}
```

添加 import: `import { translateWeather, translateWindDirection } from '@/lib/weather-utils'`

### Step 5: 更新测试

**`src/components/weather-strip.test.tsx`**：
- 测试 "应该显示天气描述" 保持不变（mock `t()` 返回 key 名）

**`src/components/weather-card.test.tsx`**：
- 测试 "应该显示当前天气数据" 中 `screen.getByText('晴')` 需要调整（mock 环境下 `t.has()` 返回值影响行为）

**`src/lib/weather-utils.test.ts`**：
- 新增 `translateWeather` 和 `translateWindDirection` 的单元测试
- 测试覆盖：已有翻译的 key / 未覆盖的回退 / 空字符串

### Step 6: 更新分析文档

更新 `doc/data-flow/WEATHER_CACHE_I18N_ANALYSIS.md`：
- 第 2.1 节标记为 ✅ 已修复
- 新增第 7 节 "修复记录" 记录实际采用的方案和变更

## 不修改的部分

- **API 层** (`/api/weather/route.ts`) — 不变，继续返回中文原始数据
- **缓存策略** — 不变，SWR key 不含 locale（正确行为）
- **`WEATHER_ICONS`** — 不变，中文 key 映射正确
- **`SUITABILITY_CONFIG`** — 不变，当前未被显示的 label/description 暂不处理
- **`climbing` 对象结构** — 不变（方案 B 的范畴，本次不做）
- **`WeatherBadge`** — 不变，只显示温度和 emoji 图标

## 风险评估

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 遗漏天气描述导致回退中文 | 低 | 低 | `t.has()` 安全回退 + 覆盖常见 17 种 |
| 翻译不准确 | 低 | 低 | 天气术语标准化，可后续微调 |
| 测试 mock 适配 | 中 | 低 | 测试使用 mock `t`，需确认 `t.has()` 行为 |

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `messages/zh.json` | 新增 `weatherDesc` + `windDir` |
| `messages/en.json` | 新增 `weatherDesc` + `windDir` |
| `messages/fr.json` | 新增 `weatherDesc` + `windDir` |
| `src/lib/weather-utils.ts` | 新增 `translateWeather` + `translateWindDirection` |
| `src/components/weather-strip.tsx` | 使用 `translateWeather` |
| `src/components/weather-card.tsx` | 使用 `translateWeather` + `translateWindDirection` |
| `src/lib/weather-utils.test.ts` | 新增翻译函数测试 |
| `src/components/weather-strip.test.tsx` | 适配新行为 |
| `src/components/weather-card.test.tsx` | 适配新行为 |
| `doc/data-flow/WEATHER_CACHE_I18N_ANALYSIS.md` | 标记已修复 + 修复记录 |
