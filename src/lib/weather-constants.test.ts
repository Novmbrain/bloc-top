import { describe, it, expect } from 'vitest'
import {
  WEATHER_ICONS,
  getWeatherIcon,
  SUITABILITY_CONFIG,
  CLIMBING_THRESHOLDS,
  BAD_WEATHER_KEYWORDS,
  IDEAL_WEATHER_KEYWORDS,
  parseWindPower,
  LUOYUAN_DEFAULT_COORDS,
} from './weather-constants'

describe('weather-constants', () => {
  describe('getWeatherIcon', () => {
    it('应该返回晴天图标', () => {
      expect(getWeatherIcon('晴')).toBe('☀️')
    })

    it('应该返回多云图标', () => {
      expect(getWeatherIcon('多云')).toBe('☁️')
      expect(getWeatherIcon('少云')).toBe('🌤️')
      expect(getWeatherIcon('晴间多云')).toBe('⛅')
    })

    it('应该返回雨天图标', () => {
      expect(getWeatherIcon('小雨')).toBe('🌧️')
      expect(getWeatherIcon('中雨')).toBe('🌧️')
      expect(getWeatherIcon('大雨')).toBe('🌧️')
      expect(getWeatherIcon('雷阵雨')).toBe('⛈️')
    })

    it('应该返回雪天图标', () => {
      expect(getWeatherIcon('小雪')).toBe('❄️')
      expect(getWeatherIcon('大雪')).toBe('❄️')
      expect(getWeatherIcon('雨夹雪')).toBe('🌨️')
    })

    it('应该返回雾霾图标', () => {
      expect(getWeatherIcon('雾')).toBe('🌫️')
      expect(getWeatherIcon('霾')).toBe('🌫️')
      expect(getWeatherIcon('沙尘暴')).toBe('🌫️')
    })

    it('应该返回风天图标', () => {
      expect(getWeatherIcon('大风')).toBe('💨')
      expect(getWeatherIcon('龙卷风')).toBe('🌪️')
    })

    it('应该对未知天气返回问号图标', () => {
      expect(getWeatherIcon('未知天气类型')).toBe('❓')
      expect(getWeatherIcon('')).toBe('❓')
      expect(getWeatherIcon('随机字符串')).toBe('❓')
    })
  })

  describe('parseWindPower', () => {
    it('应该解析单数字格式', () => {
      expect(parseWindPower('3')).toBe(3)
      expect(parseWindPower('5')).toBe(5)
      expect(parseWindPower('0')).toBe(0)
    })

    it('应该解析范围格式 (取最大值)', () => {
      expect(parseWindPower('3-4')).toBe(4)
      expect(parseWindPower('1-2')).toBe(2)
      expect(parseWindPower('5-6')).toBe(6)
    })

    it('应该解析 ≤ 前缀格式', () => {
      expect(parseWindPower('≤3')).toBe(3)
      expect(parseWindPower('≤2')).toBe(2)
    })

    it('应该对空/无效输入返回 0', () => {
      expect(parseWindPower('')).toBe(0)
      expect(parseWindPower('无风')).toBe(0)
    })
  })

  describe('WEATHER_ICONS 常量', () => {
    it('应该包含晴天系列图标', () => {
      expect(WEATHER_ICONS['晴']).toBe('☀️')
      expect(WEATHER_ICONS['少云']).toBe('🌤️')
      expect(WEATHER_ICONS['晴间多云']).toBe('⛅')
      expect(WEATHER_ICONS['多云']).toBe('☁️')
    })

    it('应该包含雨天系列图标', () => {
      expect(WEATHER_ICONS['小雨']).toBe('🌧️')
      expect(WEATHER_ICONS['雷阵雨']).toBe('⛈️')
    })

    it('应该包含雪天系列图标', () => {
      expect(WEATHER_ICONS['小雪']).toBe('❄️')
      expect(WEATHER_ICONS['大雪']).toBe('❄️')
    })
  })

  describe('SUITABILITY_CONFIG 常量', () => {
    it('应该包含所有适宜度等级配置', () => {
      expect(SUITABILITY_CONFIG).toHaveProperty('excellent')
      expect(SUITABILITY_CONFIG).toHaveProperty('good')
      expect(SUITABILITY_CONFIG).toHaveProperty('fair')
      expect(SUITABILITY_CONFIG).toHaveProperty('poor')
    })

    it('每个等级应该包含完整配置', () => {
      const requiredKeys = ['label', 'color', 'bgColor', 'description']

      Object.values(SUITABILITY_CONFIG).forEach((config) => {
        requiredKeys.forEach((key) => {
          expect(config).toHaveProperty(key)
          expect(config[key as keyof typeof config]).toBeTruthy()
        })
      })
    })

    it('excellent 配置应该正确', () => {
      expect(SUITABILITY_CONFIG.excellent.label).toBe('极佳')
      expect(SUITABILITY_CONFIG.excellent.color).toBe('#16a34a')
    })

    it('poor 配置应该正确', () => {
      expect(SUITABILITY_CONFIG.poor.label).toBe('不宜')
      expect(SUITABILITY_CONFIG.poor.color).toBe('#dc2626')
    })
  })

  describe('CLIMBING_THRESHOLDS 常量', () => {
    it('应该包含温度阈值', () => {
      expect(CLIMBING_THRESHOLDS.temperature).toBeDefined()
      expect(CLIMBING_THRESHOLDS.temperature.excellent).toEqual({ min: 12, max: 25 })
      expect(CLIMBING_THRESHOLDS.temperature.good).toEqual({ min: 8, max: 28 })
      expect(CLIMBING_THRESHOLDS.temperature.fair).toEqual({ min: 5, max: 32 })
    })

    it('应该包含湿度阈值', () => {
      expect(CLIMBING_THRESHOLDS.humidity).toBeDefined()
      expect(CLIMBING_THRESHOLDS.humidity.excellent).toEqual({ min: 30, max: 60 })
      expect(CLIMBING_THRESHOLDS.humidity.good).toEqual({ min: 25, max: 70 })
      expect(CLIMBING_THRESHOLDS.humidity.fair).toEqual({ min: 20, max: 80 })
    })

    it('应该包含风力阈值', () => {
      expect(CLIMBING_THRESHOLDS.windPower).toBeDefined()
      expect(CLIMBING_THRESHOLDS.windPower.excellent).toBe(3)
      expect(CLIMBING_THRESHOLDS.windPower.good).toBe(4)
      expect(CLIMBING_THRESHOLDS.windPower.fair).toBe(5)
    })

    it('阈值边界应该合理 (excellent < good < fair)', () => {
      // 温度范围应该逐级扩大
      expect(CLIMBING_THRESHOLDS.temperature.excellent.min).toBeGreaterThan(
        CLIMBING_THRESHOLDS.temperature.good.min
      )
      expect(CLIMBING_THRESHOLDS.temperature.excellent.max).toBeLessThan(
        CLIMBING_THRESHOLDS.temperature.good.max
      )

      // 风力阈值应该逐级增大
      expect(CLIMBING_THRESHOLDS.windPower.excellent).toBeLessThan(
        CLIMBING_THRESHOLDS.windPower.good
      )
      expect(CLIMBING_THRESHOLDS.windPower.good).toBeLessThan(
        CLIMBING_THRESHOLDS.windPower.fair
      )
    })
  })

  describe('BAD_WEATHER_KEYWORDS 常量', () => {
    it('应该包含雨雪相关关键词', () => {
      expect(BAD_WEATHER_KEYWORDS).toContain('雨')
      expect(BAD_WEATHER_KEYWORDS).toContain('雪')
      expect(BAD_WEATHER_KEYWORDS).toContain('雷')
    })

    it('应该包含极端天气关键词', () => {
      expect(BAD_WEATHER_KEYWORDS).toContain('暴')
      expect(BAD_WEATHER_KEYWORDS).toContain('冰雹')
      expect(BAD_WEATHER_KEYWORDS).toContain('龙卷')
      expect(BAD_WEATHER_KEYWORDS).toContain('飓风')
    })

    it('应该包含能见度相关关键词', () => {
      expect(BAD_WEATHER_KEYWORDS).toContain('雾')
      expect(BAD_WEATHER_KEYWORDS).toContain('霾')
      expect(BAD_WEATHER_KEYWORDS).toContain('沙尘')
    })
  })

  describe('IDEAL_WEATHER_KEYWORDS 常量', () => {
    it('应该包含晴天关键词', () => {
      expect(IDEAL_WEATHER_KEYWORDS).toContain('晴')
      expect(IDEAL_WEATHER_KEYWORDS).toContain('少云')
    })

    it('不应该包含雨雪关键词', () => {
      expect(IDEAL_WEATHER_KEYWORDS).not.toContain('雨')
      expect(IDEAL_WEATHER_KEYWORDS).not.toContain('雪')
    })
  })

  describe('LUOYUAN_DEFAULT_COORDS 常量', () => {
    it('应该包含有效的经纬度坐标', () => {
      expect(LUOYUAN_DEFAULT_COORDS.lng).toBeCloseTo(119.5495, 4)
      expect(LUOYUAN_DEFAULT_COORDS.lat).toBeCloseTo(26.4893, 4)
    })

    it('经纬度应该在有效范围内', () => {
      expect(LUOYUAN_DEFAULT_COORDS.lng).toBeGreaterThan(-180)
      expect(LUOYUAN_DEFAULT_COORDS.lng).toBeLessThan(180)
      expect(LUOYUAN_DEFAULT_COORDS.lat).toBeGreaterThan(-90)
      expect(LUOYUAN_DEFAULT_COORDS.lat).toBeLessThan(90)
    })
  })
})
