/**
 * 城市工具函数（纯同步函数）
 *
 * 所有函数接收数据数组作为参数，不依赖全局状态或 DB。
 * 数据由服务端组件从 DB 获取后通过 props 传递给客户端。
 */

import type { CityConfig, PrefectureConfig, Coordinates, CitySelection } from './types'

// ==================== 常量 ====================

/** 默认城市 ID */
export const DEFAULT_CITY_ID = 'luoyuan'

/** 城市选择 cookie 名称（服务端读取用） */
export const CITY_COOKIE_NAME = 'city'

/** Cookie 最大生命周期：1 年 (秒) */
export const CITY_COOKIE_MAX_AGE = 365 * 24 * 60 * 60

// ==================== 查询函数 ====================

/** 根据 ID 获取城市配置 */
export function findCityById(cities: CityConfig[], id: string): CityConfig | undefined {
  return cities.find((city) => city.id === id)
}

/** 获取城市名称 */
export function findCityName(cities: CityConfig[], id: string): string {
  return findCityById(cities, id)?.name ?? id
}

/** 验证是否为有效的城市 ID */
export function isCityValid(cities: CityConfig[], id: string): boolean {
  return cities.some((city) => city.id === id)
}

/** 检查城市是否有数据可用 */
export function isCityAvailable(cities: CityConfig[], id: string): boolean {
  return findCityById(cities, id)?.available ?? false
}

/** 根据 CityId 反查所属地级市 */
export function findPrefectureByDistrictId(
  prefectures: PrefectureConfig[],
  districtId: string,
): PrefectureConfig | undefined {
  return prefectures.find((p) => p.districts.includes(districtId))
}

/**
 * 根据 adcode 查找城市
 * 先精确匹配，再通过市级前缀匹配 → prefecture.defaultDistrict
 */
export function findCityByAdcode(
  cities: CityConfig[],
  prefectures: PrefectureConfig[],
  adcode: string,
): CityConfig | undefined {
  // 精确匹配
  const exact = cities.find((city) => city.adcode === adcode)
  if (exact) return exact

  // 前缀匹配 → 通过 Prefecture.defaultDistrict 决定
  const cityPrefix = adcode.slice(0, 4)
  const prefecture = prefectures.find((p) =>
    p.districts.some((d) => {
      const city = cities.find((c) => c.id === d)
      return city?.adcode.startsWith(cityPrefix)
    }),
  )
  if (prefecture) {
    return findCityById(cities, prefecture.defaultDistrict)
  }

  return undefined
}

/**
 * 根据坐标计算最近的城市
 * 使用简化的球面距离计算
 */
export function findNearestCity(cities: CityConfig[], coords: Coordinates): CityConfig {
  let nearest = cities[0]
  let minDistance = Infinity

  for (const city of cities) {
    const latDiff = coords.lat - city.coordinates.lat
    const lngDiff = coords.lng - city.coordinates.lng
    const distance = latDiff * latDiff + lngDiff * lngDiff
    if (distance < minDistance) {
      minDistance = distance
      nearest = city
    }
  }

  return nearest
}

// ==================== CitySelection 序列化 ====================

/**
 * 解析 cookie/localStorage 中的选择值，兼容旧格式纯字符串
 *
 * - JSON 格式 `{"type":"city","id":"luoyuan"}` → 直接返回
 * - 旧格式纯字符串 `"luoyuan"` → 包装为 `{ type: 'city', id: 'luoyuan' }`
 * - 空值 → fallback 为默认城市
 */
export function parseCitySelection(raw: string | undefined): CitySelection {
  if (!raw) return { type: 'city', id: DEFAULT_CITY_ID }

  // cookie 值可能经过 encodeURIComponent 编码，先尝试解码
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    // 解码失败（非合法编码）→ 使用原值
  }

  try {
    const parsed = JSON.parse(decoded)
    if (parsed && typeof parsed === 'object' && parsed.type && parsed.id) {
      return parsed as CitySelection
    }
  } catch {
    // JSON.parse 失败 → 当作旧格式纯字符串
  }

  return { type: 'city', id: decoded }
}

/** 序列化选择对象为字符串（存入 cookie/localStorage） */
export function serializeCitySelection(selection: CitySelection): string {
  return JSON.stringify(selection)
}
