import type { ClimbingSuitability } from '@/types'

/**
 * 天气图标映射
 * 将高德天气 API 返回的天气描述映射到对应的 emoji 图标
 */
export const WEATHER_ICONS: Record<string, string> = {
  // 晴天系列
  '晴': '☀️',
  '少云': '🌤️',
  '晴间多云': '⛅',
  '多云': '☁️',

  // 阴天
  '阴': '☁️',

  // 雨天系列
  '阵雨': '🌦️',
  '雷阵雨': '⛈️',
  '雷阵雨并伴有冰雹': '⛈️',
  '小雨': '🌧️',
  '中雨': '🌧️',
  '大雨': '🌧️',
  '暴雨': '🌧️',
  '大暴雨': '🌧️',
  '特大暴雨': '🌧️',
  '强阵雨': '🌧️',
  '强雷阵雨': '⛈️',
  '极端降雨': '🌧️',
  '毛毛雨/细雨': '🌧️',
  '雨': '🌧️',
  '小雨-中雨': '🌧️',
  '中雨-大雨': '🌧️',
  '大雨-暴雨': '🌧️',
  '暴雨-大暴雨': '🌧️',
  '大暴雨-特大暴雨': '🌧️',
  '冻雨': '🌧️',

  // 雪天系列
  '雨夹雪': '🌨️',
  '阵雨夹雪': '🌨️',
  '小雪': '❄️',
  '中雪': '❄️',
  '大雪': '❄️',
  '暴雪': '❄️',
  '雪': '❄️',
  '阵雪': '❄️',
  '小雪-中雪': '❄️',
  '中雪-大雪': '❄️',
  '大雪-暴雪': '❄️',

  // 雾霾系列
  '薄雾': '🌫️',
  '雾': '🌫️',
  '霾': '🌫️',
  '扬沙': '🌫️',
  '浮尘': '🌫️',
  '沙尘暴': '🌫️',
  '强沙尘暴': '🌫️',
  '浓雾': '🌫️',
  '强浓雾': '🌫️',
  '中度霾': '🌫️',
  '重度霾': '🌫️',
  '严重霾': '🌫️',
  '大雾': '🌫️',
  '特强浓雾': '🌫️',

  // 风
  '有风': '💨',
  '平静': '🌤️',
  '微风': '🌤️',
  '和风': '🌤️',
  '清风': '🌤️',
  '强风/劲风': '💨',
  '疾风': '💨',
  '大风': '💨',
  '烈风': '💨',
  '风暴': '🌪️',
  '狂爆风': '🌪️',
  '飓风': '🌪️',
  '热带风暴': '🌪️',
  '龙卷风': '🌪️',

  // 其他
  '未知': '❓',
}

/**
 * 获取天气图标
 * @param weather 天气描述
 * @returns emoji 图标
 */
export function getWeatherIcon(weather: string): string {
  return WEATHER_ICONS[weather] || '❓'
}

/**
 * 适宜度等级配置
 */
export const SUITABILITY_CONFIG: Record<ClimbingSuitability, {
  label: string
  color: string
  bgColor: string
  description: string
}> = {
  excellent: {
    label: '极佳',
    color: '#16a34a',      // green-600
    bgColor: '#dcfce7',    // green-100
    description: '温湿度适宜，岩面干燥，出发吧！',
  },
  good: {
    label: '良好',
    color: '#2563eb',      // blue-600
    bgColor: '#dbeafe',    // blue-100
    description: '天气不错，适合攀岩',
  },
  fair: {
    label: '一般',
    color: '#ca8a04',      // yellow-600
    bgColor: '#fef9c3',    // yellow-100
    description: '条件一般，注意安全',
  },
  poor: {
    label: '不宜',
    color: '#dc2626',      // red-600
    bgColor: '#fee2e2',    // red-100
    description: '不建议户外攀岩',
  },
}

/**
 * 攀岩适宜度评估阈值
 */
export const CLIMBING_THRESHOLDS = {
  // 温度阈值 (摄氏度)
  temperature: {
    excellent: { min: 12, max: 25 },
    good: { min: 8, max: 28 },
    fair: { min: 5, max: 32 },
    // poor: 超出 fair 范围
  },

  // 湿度阈值 (百分比)
  humidity: {
    excellent: { min: 30, max: 60 },
    good: { min: 25, max: 70 },
    fair: { min: 20, max: 80 },
    // poor: 超出 fair 范围或 > 85%
  },

  // 风力阈值 (级数)
  windPower: {
    excellent: 3,  // ≤3 级
    good: 4,       // ≤4 级
    fair: 5,       // ≤5 级
    // poor: > 5 级
  },
}

/**
 * 恶劣天气关键词 (直接判定为 poor)
 */
export const BAD_WEATHER_KEYWORDS = [
  '雨', '雪', '雷', '暴', '冰雹',
  '雾', '霾', '沙尘', '龙卷', '飓风', '风暴',
]

/**
 * 理想天气关键词 (加分项)
 */
export const IDEAL_WEATHER_KEYWORDS = [
  '晴', '少云',
]

/**
 * 解析风力等级为数字
 * 高德 API 返回的风力格式如: "≤3" "3-4" "4"
 * @param power 风力字符串
 * @returns 风力数字 (取最大值)
 */
export function parseWindPower(power: string): number {
  if (!power) return 0

  // 移除 ≤ 符号
  const cleaned = power.replace('≤', '')

  // 处理范围格式 "3-4"
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-')
    return parseInt(parts[1], 10) || 0
  }

  return parseInt(cleaned, 10) || 0
}

/**
 * 天气 API 缓存时间 (毫秒)
 * 默认 1 小时，天气数据不需要频繁更新
 */
export const WEATHER_CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * 罗源县默认坐标 (用于区域天气)
 */
export const LUOYUAN_DEFAULT_COORDS = {
  lng: 119.5495,
  lat: 26.4893,
}
