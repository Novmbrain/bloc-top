import type { ClimbingSuitability, ClimbingCondition, WeatherLive, WeatherForecast } from '@/types'
import {
  CLIMBING_THRESHOLDS,
  BAD_WEATHER_KEYWORDS,
  IDEAL_WEATHER_KEYWORDS,
  SUITABILITY_CONFIG,
  parseWindPower,
} from './weather-constants'

/**
 * 评估攀岩适宜度
 * 综合考虑天气、温度、湿度、风力等因素
 *
 * 评估逻辑:
 * 1. 首先检查是否有恶劣天气 (直接判定为 poor)
 * 2. 然后评估各项指标，每项给出评分
 * 3. 最终取所有评分中的最低值作为综合评估
 *
 * @param live 当前天气数据
 * @returns 攀岩适宜度评估结果
 */
interface EvaluationOptions {
  /** 今日是否有降雨预报（岩面可能湿滑提醒） */
  todayHasRain?: boolean
}

export function evaluateClimbingCondition(
  live: WeatherLive,
  options?: EvaluationOptions
): ClimbingCondition {
  const factors: string[] = []
  let worstLevel: ClimbingSuitability = 'excellent'

  // 1. 检查恶劣天气
  const hasBadWeather = BAD_WEATHER_KEYWORDS.some(keyword =>
    live.weather.includes(keyword)
  )

  if (hasBadWeather) {
    factors.push(`天气: ${live.weather}`)
    return {
      level: 'poor',
      label: SUITABILITY_CONFIG.poor.label,
      description: `${live.weather}天气不适合户外攀岩`,
      factors,
    }
  }

  // 2. 检查理想天气 (加分项，但不影响最终评级)
  const hasIdealWeather = IDEAL_WEATHER_KEYWORDS.some(keyword =>
    live.weather.includes(keyword)
  )
  if (hasIdealWeather) {
    factors.push(`天气: ${live.weather} ✓`)
  }

  // 3. 评估温度
  const tempLevel = evaluateTemperature(live.temperature)
  if (tempLevel !== 'excellent') {
    if (live.temperature < CLIMBING_THRESHOLDS.temperature.fair.min) {
      factors.push(`温度偏低: ${live.temperature}°C`)
    } else if (live.temperature > CLIMBING_THRESHOLDS.temperature.fair.max) {
      factors.push(`温度偏高: ${live.temperature}°C`)
    } else {
      factors.push(`温度: ${live.temperature}°C`)
    }
  }
  worstLevel = getWorstLevel(worstLevel, tempLevel)

  // 4. 评估湿度
  const humidityLevel = evaluateHumidity(live.humidity)
  if (humidityLevel !== 'excellent') {
    if (live.humidity > CLIMBING_THRESHOLDS.humidity.fair.max) {
      factors.push(`湿度过高: ${live.humidity}%`)
    } else if (live.humidity < CLIMBING_THRESHOLDS.humidity.fair.min) {
      factors.push(`湿度偏低: ${live.humidity}%`)
    } else {
      factors.push(`湿度: ${live.humidity}%`)
    }
  }
  worstLevel = getWorstLevel(worstLevel, humidityLevel)

  // 5. 评估风力
  const windPower = parseWindPower(live.windPower)
  const windLevel = evaluateWindPower(windPower)
  if (windLevel !== 'excellent') {
    factors.push(`风力: ${live.windPower}级`)
  }
  worstLevel = getWorstLevel(worstLevel, windLevel)

  // 6. 降雨预报提醒 (不降低等级，仅 factor 提示)
  if (options?.todayHasRain) {
    factors.push('今日有降雨预报，岩面可能湿滑')
  }

  // 生成描述
  const config = SUITABILITY_CONFIG[worstLevel]
  let description = config.description

  // 如果是极佳或良好，添加正面描述
  if (worstLevel === 'excellent' && hasIdealWeather) {
    description = '阳光明媚，温湿度适宜，完美的攀岩天！'
  } else if (worstLevel === 'good' && hasIdealWeather) {
    description = '天气不错，适合户外攀岩'
  }

  return {
    level: worstLevel,
    label: config.label,
    description,
    factors,
  }
}

/**
 * 评估预报天的攀岩适宜度
 * 使用白天天气数据，湿度因预报 API 不提供而假设为中性值 (50%)
 */
export function evaluateForecastCondition(forecast: WeatherForecast): ClimbingCondition {
  const syntheticLive: WeatherLive = {
    weather: forecast.dayWeather,
    temperature: forecast.dayTemp,
    humidity: 50, // 高德预报不含湿度，假设中性值
    windDirection: forecast.dayWind,
    windPower: forecast.dayPower,
    reportTime: forecast.date,
  }
  return evaluateClimbingCondition(syntheticLive)
}

/**
 * 评估温度等级
 */
function evaluateTemperature(temp: number): ClimbingSuitability {
  const { excellent, good, fair } = CLIMBING_THRESHOLDS.temperature

  if (temp >= excellent.min && temp <= excellent.max) {
    return 'excellent'
  }
  if (temp >= good.min && temp <= good.max) {
    return 'good'
  }
  if (temp >= fair.min && temp <= fair.max) {
    return 'fair'
  }
  return 'poor'
}

/**
 * 评估湿度等级
 */
function evaluateHumidity(humidity: number): ClimbingSuitability {
  const { excellent, good, fair } = CLIMBING_THRESHOLDS.humidity

  // 湿度超过 85% 直接判定为 poor (手感太差)
  if (humidity > 85) {
    return 'poor'
  }

  if (humidity >= excellent.min && humidity <= excellent.max) {
    return 'excellent'
  }
  if (humidity >= good.min && humidity <= good.max) {
    return 'good'
  }
  if (humidity >= fair.min && humidity <= fair.max) {
    return 'fair'
  }
  return 'poor'
}

/**
 * 评估风力等级
 */
function evaluateWindPower(power: number): ClimbingSuitability {
  const thresholds = CLIMBING_THRESHOLDS.windPower

  if (power <= thresholds.excellent) {
    return 'excellent'
  }
  if (power <= thresholds.good) {
    return 'good'
  }
  if (power <= thresholds.fair) {
    return 'fair'
  }
  return 'poor'
}

/**
 * 获取两个等级中较差的那个
 */
function getWorstLevel(
  level1: ClimbingSuitability,
  level2: ClimbingSuitability
): ClimbingSuitability {
  const order: ClimbingSuitability[] = ['excellent', 'good', 'fair', 'poor']
  const index1 = order.indexOf(level1)
  const index2 = order.indexOf(level2)
  return order[Math.max(index1, index2)]
}

/**
 * 格式化星期显示
 * 将 "1", "2" ... "7" 转换为 "周一", "周二" ... "周日"
 */
export function formatWeekday(week: string): string {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const index = parseInt(week, 10)
  if (index >= 1 && index <= 7) {
    // 高德 API: 1=周一, 7=周日
    return index === 7 ? weekdays[0] : weekdays[index]
  }
  return week
}

/**
 * 格式化日期为简短格式
 * "2024-01-15" -> "01/15"
 */
export function formatShortDate(date: string): string {
  const parts = date.split('-')
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`
  }
  return date
}

/**
 * 判断是否为今天
 */
export function isToday(dateStr: string): boolean {
  const today = new Date()
  const date = new Date(dateStr)
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

/**
 * 获取适宜度对应的图标
 */
export function getSuitabilityIcon(level: ClimbingSuitability): string {
  switch (level) {
    case 'excellent':
      return '🟢'
    case 'good':
      return '🔵'
    case 'fair':
      return '🟡'
    case 'poor':
      return '🔴'
  }
}
