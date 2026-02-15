/**
 * 天气工具函数测试
 *
 * 测试覆盖:
 * - 攀岩适宜度评估
 * - 日期格式化
 * - 适宜度图标
 * - 边界条件
 */
import { describe, it, expect } from 'vitest'
import type { WeatherLive, WeatherForecast } from '@/types'
import {
  evaluateClimbingCondition,
  evaluateForecastCondition,
  formatWeekday,
  formatShortDate,
  isToday,
  getSuitabilityIcon,
} from './weather-utils'

// 创建模拟天气数据的辅助函数
function createMockWeather(overrides: Partial<WeatherLive> = {}): WeatherLive {
  return {
    weather: '晴',
    temperature: 22,
    humidity: 55,
    windDirection: '东南风',
    windPower: '2',
    reportTime: '2025-01-19 10:00:00',
    ...overrides,
  }
}

describe('天气工具函数', () => {
  describe('evaluateClimbingCondition', () => {
    describe('恶劣天气判定', () => {
      it('雨天直接判定为 poor', () => {
        const weather = createMockWeather({ weather: '小雨' })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('poor')
        expect(result.factors).toContain('天气: 小雨')
      })

      it('雷暴天气判定为 poor', () => {
        const weather = createMockWeather({ weather: '雷阵雨' })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('poor')
      })

      it('暴风天气判定为 poor', () => {
        // 注意：'大风' 不在恶劣天气关键词中，强风通过 windPower 字段判断
        // 这里测试的是天气字符串包含 '暴' 或 '风暴' 的情况
        const weather = createMockWeather({ weather: '暴风' })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('poor')
      })

      it('雪天判定为 poor', () => {
        const weather = createMockWeather({ weather: '小雪' })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('poor')
      })
    })

    describe('理想天气判定', () => {
      it('晴天 + 理想温湿度 = excellent', () => {
        const weather = createMockWeather({
          weather: '晴',
          temperature: 20,
          humidity: 50,
          windPower: '1',
        })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('excellent')
        expect(result.factors).toContain('天气: 晴 ✓')
      })

      it('多云天气也是理想天气', () => {
        const weather = createMockWeather({
          weather: '多云',
          temperature: 18,
          humidity: 55,
          windPower: '2',
        })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('excellent')
      })
    })

    describe('温度评估', () => {
      it('极低温度判定为 poor', () => {
        const weather = createMockWeather({ temperature: 0 })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('poor')
        expect(result.factors.some((f) => f.includes('温度偏低'))).toBe(true)
      })

      it('极高温度判定为 poor', () => {
        const weather = createMockWeather({ temperature: 40 })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('poor')
        expect(result.factors.some((f) => f.includes('温度偏高'))).toBe(true)
      })

      it('适中温度判定为 good 或 excellent', () => {
        const weather = createMockWeather({ temperature: 22 })
        const result = evaluateClimbingCondition(weather)
        expect(['excellent', 'good']).toContain(result.level)
      })
    })

    describe('湿度评估', () => {
      it('超高湿度 (>85%) 判定为 poor', () => {
        const weather = createMockWeather({ humidity: 90 })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('poor')
        expect(result.factors.some((f) => f.includes('湿度过高'))).toBe(true)
      })

      it('极低湿度有提示', () => {
        const weather = createMockWeather({ humidity: 20 })
        const result = evaluateClimbingCondition(weather)
        // 低湿度可能是 fair，取决于其他因素
        expect(result.factors.some((f) => f.includes('湿度'))).toBe(true)
      })
    })

    describe('风力评估', () => {
      it('强风 (6级以上) 判定为 poor', () => {
        const weather = createMockWeather({ windPower: '7' })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('poor')
      })

      it('中等风力有提示', () => {
        const weather = createMockWeather({ windPower: '4' })
        const result = evaluateClimbingCondition(weather)
        expect(result.factors.some((f) => f.includes('风力'))).toBe(true)
      })

      it('微风无提示', () => {
        const weather = createMockWeather({ windPower: '1' })
        const result = evaluateClimbingCondition(weather)
        expect(result.factors.some((f) => f.includes('风力'))).toBe(false)
      })
    })

    describe('降雨提醒', () => {
      it('今日有降雨预报时添加因素提示', () => {
        const weather = createMockWeather({ weather: '晴', temperature: 20, humidity: 50, windPower: '2' })
        const result = evaluateClimbingCondition(weather, { todayHasRain: true })
        expect(result.factors.some(f => f.includes('降雨'))).toBe(true)
        // 不降低等级
        expect(result.level).toBe('excellent')
      })

      it('已是恶劣天气时不重复添加降雨提示', () => {
        const weather = createMockWeather({ weather: '小雨' })
        const result = evaluateClimbingCondition(weather, { todayHasRain: true })
        expect(result.level).toBe('poor')
        // 恶劣天气短路返回，factors 中只有天气因素
        expect(result.factors.filter(f => f.includes('降雨')).length).toBe(0)
      })

      it('无 options 参数时保持原有行为', () => {
        const weather = createMockWeather({ weather: '晴', temperature: 20, humidity: 50, windPower: '2' })
        const result = evaluateClimbingCondition(weather)
        expect(result.level).toBe('excellent')
        expect(result.factors.some(f => f.includes('降雨'))).toBe(false)
      })
    })

    describe('综合评估', () => {
      it('返回完整的评估结构', () => {
        const weather = createMockWeather()
        const result = evaluateClimbingCondition(weather)

        expect(result).toHaveProperty('level')
        expect(result).toHaveProperty('label')
        expect(result).toHaveProperty('description')
        expect(result).toHaveProperty('factors')
        expect(Array.isArray(result.factors)).toBe(true)
      })

      it('多个不良因素取最差等级', () => {
        const weather = createMockWeather({
          weather: '阴',
          temperature: 35, // 偏高
          humidity: 80, // 偏高
          windPower: '4', // 中等
        })
        const result = evaluateClimbingCondition(weather)
        // 应该是较差的等级
        expect(['fair', 'poor']).toContain(result.level)
      })
    })
  })

  describe('formatWeekday', () => {
    it('正确转换数字为中文星期', () => {
      expect(formatWeekday('1')).toBe('周一')
      expect(formatWeekday('2')).toBe('周二')
      expect(formatWeekday('3')).toBe('周三')
      expect(formatWeekday('4')).toBe('周四')
      expect(formatWeekday('5')).toBe('周五')
      expect(formatWeekday('6')).toBe('周六')
      expect(formatWeekday('7')).toBe('周日')
    })

    it('无效输入返回原值', () => {
      expect(formatWeekday('0')).toBe('0')
      expect(formatWeekday('8')).toBe('8')
      expect(formatWeekday('abc')).toBe('abc')
    })
  })

  describe('formatShortDate', () => {
    it('正确格式化日期', () => {
      expect(formatShortDate('2025-01-19')).toBe('01/19')
      expect(formatShortDate('2025-12-31')).toBe('12/31')
      expect(formatShortDate('2025-06-05')).toBe('06/05')
    })

    it('无效格式返回原值', () => {
      expect(formatShortDate('20250119')).toBe('20250119')
      expect(formatShortDate('01-19')).toBe('01-19')
      expect(formatShortDate('')).toBe('')
    })
  })

  describe('isToday', () => {
    it('判断今天的日期', () => {
      const today = new Date().toISOString().split('T')[0]
      expect(isToday(today)).toBe(true)
    })

    it('判断昨天的日期', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      expect(isToday(yesterdayStr)).toBe(false)
    })

    it('判断明天的日期', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      expect(isToday(tomorrowStr)).toBe(false)
    })
  })

  describe('getSuitabilityIcon', () => {
    it('返回正确的图标', () => {
      expect(getSuitabilityIcon('excellent')).toBe('🟢')
      expect(getSuitabilityIcon('good')).toBe('🔵')
      expect(getSuitabilityIcon('fair')).toBe('🟡')
      expect(getSuitabilityIcon('poor')).toBe('🔴')
    })
  })

  describe('evaluateForecastCondition', () => {
    function createMockForecast(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
      return {
        date: '2026-02-07',
        week: '6',
        dayWeather: '晴',
        nightWeather: '多云',
        dayTemp: 20,
        nightTemp: 12,
        dayWind: '东南',
        nightWind: '东',
        dayPower: '2',
        nightPower: '1',
        ...overrides,
      }
    }

    it('晴天预报评估为 excellent', () => {
      const forecast = createMockForecast({ dayWeather: '晴', dayTemp: 20, dayPower: '2' })
      const result = evaluateForecastCondition(forecast)
      expect(result.level).toBe('excellent')
    })

    it('雨天预报评估为 poor', () => {
      const forecast = createMockForecast({ dayWeather: '小雨' })
      const result = evaluateForecastCondition(forecast)
      expect(result.level).toBe('poor')
    })

    it('极端温度预报评估为 poor', () => {
      const forecast = createMockForecast({ dayTemp: 40 })
      const result = evaluateForecastCondition(forecast)
      expect(result.level).toBe('poor')
    })

    it('强风预报降低评估等级', () => {
      const forecast = createMockForecast({ dayPower: '6' })
      const result = evaluateForecastCondition(forecast)
      expect(['fair', 'poor']).toContain(result.level)
    })

    it('返回完整 ClimbingCondition 结构', () => {
      const forecast = createMockForecast()
      const result = evaluateForecastCondition(forecast)
      expect(result).toHaveProperty('level')
      expect(result).toHaveProperty('label')
      expect(result).toHaveProperty('description')
      expect(result).toHaveProperty('factors')
    })
  })

  describe('攀岩场景模拟', () => {
    it('完美攀岩天：晴朗、18°C、50%湿度、微风', () => {
      const weather = createMockWeather({
        weather: '晴',
        temperature: 18,
        humidity: 50,
        windPower: '1',
      })
      const result = evaluateClimbingCondition(weather)
      expect(result.level).toBe('excellent')
      expect(result.description).toContain('完美')
    })

    it('可以攀岩但不太理想：阴天、28°C、70%湿度', () => {
      const weather = createMockWeather({
        weather: '阴',
        temperature: 28,
        humidity: 70,
        windPower: '2',
      })
      const result = evaluateClimbingCondition(weather)
      expect(['good', 'fair']).toContain(result.level)
    })

    it('不建议攀岩：雨天', () => {
      const weather = createMockWeather({
        weather: '中雨',
        temperature: 20,
        humidity: 85,
        windPower: '3',
      })
      const result = evaluateClimbingCondition(weather)
      expect(result.level).toBe('poor')
      expect(result.description).toContain('不适合')
    })
  })
})
