/**
 * 城市工具函数测试
 *
 * 所有函数都是纯同步函数，接收数据数组作为参数。
 * 测试使用内联的 mock 数据，不依赖 DB。
 */
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CITY_ID,
  CITY_COOKIE_NAME,
  findCityById,
  findCityName,
  isCityValid,
  isCityAvailable,
  findPrefectureByDistrictId,
  findCityByAdcode,
  findNearestCity,
} from './city-utils'
import type { CityConfig, PrefectureConfig } from '@/types'

// ==================== 测试数据 ====================

const testCities: CityConfig[] = [
  {
    id: 'luoyuan',
    name: '罗源',
    shortName: '罗源',
    adcode: '350123',
    coordinates: { lng: 119.549, lat: 26.489 },
    available: true,
  },
  {
    id: 'xiamen',
    name: '厦门',
    shortName: '厦门',
    adcode: '350200',
    coordinates: { lng: 118.089, lat: 24.479 },
    available: true,
  },
  {
    id: 'changle',
    name: '长乐',
    shortName: '长乐',
    adcode: '350112',
    coordinates: { lng: 119.523, lat: 25.963 },
    available: true,
  },
]

const testPrefectures: PrefectureConfig[] = [
  {
    id: 'fuzhou',
    name: '福州',
    shortName: '福州',
    districts: ['luoyuan', 'changle'],
    defaultDistrict: 'luoyuan',
  },
  {
    id: 'xiamen',
    name: '厦门',
    shortName: '厦门',
    districts: ['xiamen'],
    defaultDistrict: 'xiamen',
  },
]

// ==================== 测试 ====================

describe('城市工具函数', () => {
  describe('常量', () => {
    it('DEFAULT_CITY_ID 为 luoyuan', () => {
      expect(DEFAULT_CITY_ID).toBe('luoyuan')
    })

    it('CITY_COOKIE_NAME 为 city', () => {
      expect(CITY_COOKIE_NAME).toBe('city')
    })
  })

  describe('findCityById', () => {
    it('返回正确的城市配置', () => {
      const city = findCityById(testCities, 'luoyuan')
      expect(city?.name).toBe('罗源')
      expect(city?.adcode).toBe('350123')
    })

    it('不存在的城市返回 undefined', () => {
      expect(findCityById(testCities, 'nonexistent')).toBeUndefined()
    })

    it('空数组返回 undefined', () => {
      expect(findCityById([], 'luoyuan')).toBeUndefined()
    })
  })

  describe('findCityName', () => {
    it('返回城市名称', () => {
      expect(findCityName(testCities, 'luoyuan')).toBe('罗源')
      expect(findCityName(testCities, 'xiamen')).toBe('厦门')
    })

    it('不存在的城市返回原 ID', () => {
      expect(findCityName(testCities, 'nonexistent')).toBe('nonexistent')
    })
  })

  describe('isCityValid', () => {
    it('有效的城市 ID 返回 true', () => {
      expect(isCityValid(testCities, 'luoyuan')).toBe(true)
      expect(isCityValid(testCities, 'xiamen')).toBe(true)
    })

    it('无效的城市 ID 返回 false', () => {
      expect(isCityValid(testCities, 'invalid')).toBe(false)
      expect(isCityValid(testCities, '')).toBe(false)
    })
  })

  describe('isCityAvailable', () => {
    it('有数据的城市返回 true', () => {
      expect(isCityAvailable(testCities, 'luoyuan')).toBe(true)
    })

    it('不存在的城市返回 false', () => {
      expect(isCityAvailable(testCities, 'nonexistent')).toBe(false)
    })

    it('available=false 的城市返回 false', () => {
      const cities = [{ ...testCities[0], available: false }]
      expect(isCityAvailable(cities, 'luoyuan')).toBe(false)
    })
  })

  describe('findPrefectureByDistrictId', () => {
    it('luoyuan 属于福州', () => {
      const pref = findPrefectureByDistrictId(testPrefectures, 'luoyuan')
      expect(pref?.id).toBe('fuzhou')
    })

    it('xiamen 属于厦门', () => {
      const pref = findPrefectureByDistrictId(testPrefectures, 'xiamen')
      expect(pref?.id).toBe('xiamen')
    })

    it('changle 属于福州', () => {
      const pref = findPrefectureByDistrictId(testPrefectures, 'changle')
      expect(pref?.id).toBe('fuzhou')
    })

    it('不存在的 ID 返回 undefined', () => {
      expect(findPrefectureByDistrictId(testPrefectures, 'nonexistent')).toBeUndefined()
    })
  })

  describe('findCityByAdcode', () => {
    it('精确匹配 adcode', () => {
      const city = findCityByAdcode(testCities, testPrefectures, '350123')
      expect(city?.id).toBe('luoyuan')
    })

    it('厦门 adcode 精确匹配', () => {
      const city = findCityByAdcode(testCities, testPrefectures, '350200')
      expect(city?.id).toBe('xiamen')
    })

    it('市级前缀匹配 → 返回 defaultDistrict', () => {
      // 350100 → 福州前缀 3501，匹配 luoyuan (defaultDistrict)
      const city = findCityByAdcode(testCities, testPrefectures, '350100')
      expect(city?.id).toBe('luoyuan')
    })

    it('无匹配返回 undefined', () => {
      expect(findCityByAdcode(testCities, testPrefectures, '999999')).toBeUndefined()
    })
  })

  describe('findNearestCity', () => {
    it('罗源坐标返回罗源', () => {
      const nearest = findNearestCity(testCities, { lng: 119.549, lat: 26.489 })
      expect(nearest.id).toBe('luoyuan')
    })

    it('厦门坐标返回厦门', () => {
      const nearest = findNearestCity(testCities, { lng: 118.089, lat: 24.479 })
      expect(nearest.id).toBe('xiamen')
    })

    it('极端坐标不会崩溃', () => {
      const nearest = findNearestCity(testCities, { lng: 0, lat: 0 })
      expect(nearest).toBeDefined()
      expect(nearest.id).toBeDefined()
    })
  })
})
