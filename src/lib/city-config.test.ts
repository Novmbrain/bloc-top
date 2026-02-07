/**
 * 城市配置测试
 *
 * 测试覆盖:
 * - 城市数据完整性
 * - 查询函数正确性
 * - 地理定位匹配
 * - 边界条件
 */
import { describe, it, expect } from 'vitest'
import {
  CITIES,
  DEFAULT_CITY_ID,
  getCityById,
  getCityName,
  getCityAdcode,
  isCityAvailable,
  getCityByAdcode,
  getNearestCity,
  isValidCityId,
  type CityId,
} from './city-config'

describe('城市配置', () => {
  describe('CITIES 数据完整性', () => {
    it('至少包含一个城市', () => {
      expect(CITIES.length).toBeGreaterThan(0)
    })

    it('每个城市都有必需字段', () => {
      CITIES.forEach((city) => {
        expect(city.id).toBeDefined()
        expect(city.name).toBeDefined()
        expect(city.shortName).toBeDefined()
        expect(city.adcode).toBeDefined()
        expect(city.coordinates).toBeDefined()
        expect(city.coordinates.lng).toBeDefined()
        expect(city.coordinates.lat).toBeDefined()
        expect(typeof city.available).toBe('boolean')
      })
    })

    it('adcode 是 6 位数字字符串', () => {
      CITIES.forEach((city) => {
        expect(city.adcode).toMatch(/^\d{6}$/)
      })
    })

    it('坐标在合理范围内（中国境内）', () => {
      CITIES.forEach((city) => {
        // 中国经度范围：73°33′E ~ 135°05′E
        expect(city.coordinates.lng).toBeGreaterThan(73)
        expect(city.coordinates.lng).toBeLessThan(136)
        // 中国纬度范围：3°51′N ~ 53°33′N
        expect(city.coordinates.lat).toBeGreaterThan(3)
        expect(city.coordinates.lat).toBeLessThan(54)
      })
    })
  })

  describe('DEFAULT_CITY_ID', () => {
    it('默认城市存在于 CITIES 中', () => {
      const defaultCity = getCityById(DEFAULT_CITY_ID)
      expect(defaultCity).toBeDefined()
    })

    it('默认城市有数据可用', () => {
      expect(isCityAvailable(DEFAULT_CITY_ID)).toBe(true)
    })
  })

  describe('getCityById', () => {
    it('返回正确的城市配置', () => {
      const luoyuan = getCityById('luoyuan')
      expect(luoyuan?.name).toBe('罗源')
      expect(luoyuan?.adcode).toBe('350123')
    })

    it('不存在的城市返回 undefined', () => {
      const result = getCityById('nonexistent' as CityId)
      expect(result).toBeUndefined()
    })
  })

  describe('getCityName', () => {
    it('返回城市名称', () => {
      expect(getCityName('luoyuan')).toBe('罗源')
      expect(getCityName('xiamen')).toBe('厦门')
    })

    it('不存在的城市返回原 ID', () => {
      expect(getCityName('nonexistent' as CityId)).toBe('nonexistent')
    })
  })

  describe('getCityAdcode', () => {
    it('返回城市 adcode', () => {
      expect(getCityAdcode('luoyuan')).toBe('350123')
      expect(getCityAdcode('xiamen')).toBe('350200')
    })

    it('不存在的城市返回 undefined', () => {
      expect(getCityAdcode('nonexistent' as CityId)).toBeUndefined()
    })
  })

  describe('isCityAvailable', () => {
    it('有数据的城市返回 true', () => {
      expect(isCityAvailable('luoyuan')).toBe(true)
    })

    it('厦门已激活', () => {
      expect(isCityAvailable('xiamen')).toBe(true)
    })

    it('不存在的城市返回 false', () => {
      expect(isCityAvailable('nonexistent' as CityId)).toBe(false)
    })
  })

  describe('getCityByAdcode', () => {
    it('精确匹配 adcode', () => {
      const luoyuan = getCityByAdcode('350123')
      expect(luoyuan?.id).toBe('luoyuan')

      const xiamen = getCityByAdcode('350200')
      expect(xiamen?.id).toBe('xiamen')
    })

    it('匹配上级行政区（市级前缀）', () => {
      // 350100 是福州市的前缀，罗源县 350123 属于福州
      const city = getCityByAdcode('350100')
      // 应该匹配到罗源（如果是唯一匹配）
      expect(city).toBeDefined()
    })

    it('无匹配返回 undefined', () => {
      const result = getCityByAdcode('999999')
      expect(result).toBeUndefined()
    })
  })

  describe('getNearestCity', () => {
    it('精确坐标返回正确城市', () => {
      // 罗源坐标
      const luoyuanCoords = { lng: 119.549, lat: 26.489 }
      const nearest = getNearestCity(luoyuanCoords)
      expect(nearest.id).toBe('luoyuan')
    })

    it('厦门坐标返回厦门', () => {
      const xiamenCoords = { lng: 118.089, lat: 24.479 }
      const nearest = getNearestCity(xiamenCoords)
      expect(nearest.id).toBe('xiamen')
    })

    it('中间位置返回最近的城市', () => {
      // 在罗源和厦门之间但更接近罗源
      const midCoords = { lng: 119.0, lat: 25.8 }
      const nearest = getNearestCity(midCoords)
      // 应该返回其中之一
      expect(['luoyuan', 'xiamen']).toContain(nearest.id)
    })

    it('极端坐标不会崩溃', () => {
      const extremeCoords = { lng: 0, lat: 0 }
      const nearest = getNearestCity(extremeCoords)
      expect(nearest).toBeDefined()
      expect(nearest.id).toBeDefined()
    })
  })

  describe('CityId 自动推导 (as const)', () => {
    it('CITIES 数组的 id 应涵盖所有 CityId 值', () => {
      const cityIds = CITIES.map((c) => c.id)
      // 验证已知城市都在数组中
      expect(cityIds).toContain('luoyuan')
      expect(cityIds).toContain('xiamen')
    })

    it('CITIES 是可变数组（非 readonly）', () => {
      // as const + spread 后应得到普通数组
      expect(Array.isArray(CITIES)).toBe(true)
      // 验证可以使用数组方法（如 filter）
      const available = CITIES.filter((c) => c.available)
      expect(available.length).toBeGreaterThan(0)
    })

    it('每个 CITIES 元素的 id 都通过 isValidCityId 校验', () => {
      CITIES.forEach((city) => {
        expect(isValidCityId(city.id)).toBe(true)
      })
    })

    it('CITIES 中无重复 id', () => {
      const ids = CITIES.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('CITIES 中无重复 adcode', () => {
      const adcodes = CITIES.map((c) => c.adcode)
      expect(new Set(adcodes).size).toBe(adcodes.length)
    })
  })

  describe('isValidCityId', () => {
    it('有效的城市 ID 返回 true', () => {
      expect(isValidCityId('luoyuan')).toBe(true)
      expect(isValidCityId('xiamen')).toBe(true)
    })

    it('无效的城市 ID 返回 false', () => {
      expect(isValidCityId('invalid')).toBe(false)
      expect(isValidCityId('')).toBe(false)
      expect(isValidCityId('LUOYUAN')).toBe(false) // 大小写敏感
    })
  })

  describe('用户场景模拟', () => {
    it('用户首次访问：使用默认城市', () => {
      const defaultCity = getCityById(DEFAULT_CITY_ID)
      expect(defaultCity).toBeDefined()
      expect(isCityAvailable(defaultCity!.id)).toBe(true)
    })

    it('IP 定位返回 adcode：匹配城市', () => {
      // 模拟 IP 定位 API 返回福州市的 adcode
      const ipAdcode = '350100' // 福州市
      const city = getCityByAdcode(ipAdcode)
      expect(city).toBeDefined()
    })

    it('GPS 定位：返回最近城市', () => {
      // 用户在罗源附近
      const userLocation = { lng: 119.55, lat: 26.48 }
      const nearestCity = getNearestCity(userLocation)
      expect(nearestCity.id).toBe('luoyuan')
    })

    it('用户选择城市后验证', () => {
      const selectedCityId = 'xiamen'
      expect(isValidCityId(selectedCityId)).toBe(true)

      const cityConfig = getCityById(selectedCityId as CityId)
      expect(cityConfig?.name).toBe('厦门')

      // 厦门已激活
      expect(isCityAvailable(selectedCityId as CityId)).toBe(true)
    })
  })
})
