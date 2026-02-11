import type { Coordinates } from '@/types'

/**
 * 城市配置
 *
 * 本文件集中管理所有支持的城市信息
 * 新增城市时只需在 CITIES 数组添加配置即可
 */

// ==================== 城市配置数据 ====================

/**
 * 支持的城市列表（as const 保留字面量类型，用于自动推导 CityId）
 *
 * 排序规则：按数据完整度和用户量排序
 * 新增城市：只需在此数组添加一项，CityId 类型会自动扩展
 */
// 注意: `as Coordinates` 和 `as boolean` 是故意的类型拓宽，
// 防止 `as const` 将这些字段冻结为 readonly literal type，
// 导致后续 [...CITIES_DATA] 无法赋值给 CityConfig[]。
// 只有 `id` 字段保留为字面量类型，用于自动推导 CityId。
const CITIES_DATA = [
  {
    id: 'luoyuan',
    name: '罗源',
    shortName: '罗源',
    adcode: '350123',        // 罗源县 adcode
    coordinates: {
      lng: 119.549,          // 罗源野外抱石区域中心
      lat: 26.489,
    } as Coordinates,
    available: true as boolean,
  },
  {
    id: 'xiamen',
    name: '厦门',
    shortName: '厦门',
    adcode: '350200',        // 厦门市 adcode
    coordinates: {
      lng: 118.089,          // 厦门市中心
      lat: 24.479,
    } as Coordinates,
    available: true as boolean,
  },
  {
    id: 'changle',
    name: '长乐',
    shortName: '长乐',
    adcode: '350112',        // 长乐区 adcode
    coordinates: {
      lng: 119.523,          // 长乐区中心（待更新为攀岩区域中心）
      lat: 25.963,
    } as Coordinates,
    available: false as boolean,
  },
] as const

// ==================== 类型定义 ====================

/**
 * 城市 ID 类型（自动从 CITIES_DATA 推导，新增城市时无需手动维护）
 */
export type CityId = typeof CITIES_DATA[number]['id']

/**
 * 城市配置接口
 */
export interface CityConfig {
  id: CityId
  name: string              // 显示名称
  shortName: string         // 简称（用于 UI 空间紧张时）
  adcode: string            // 高德 adcode（用于天气 API）
  coordinates: Coordinates  // 中心坐标（用于地图、IP 定位匹配）
  available: boolean        // 是否有数据可用
}

/**
 * 支持的城市列表
 */
export const CITIES: CityConfig[] = [...CITIES_DATA]

// ==================== 工具函数 ====================

/**
 * 默认城市 ID
 */
export const DEFAULT_CITY_ID: CityId = 'luoyuan'

/**
 * 城市选择 cookie 名称（服务端读取用）
 */
export const CITY_COOKIE_NAME = 'city'

/**
 * 根据 ID 获取城市配置
 */
export function getCityById(cityId: CityId): CityConfig | undefined {
  return CITIES.find((city) => city.id === cityId)
}

/**
 * 获取城市名称
 */
export function getCityName(cityId: CityId): string {
  return getCityById(cityId)?.name ?? cityId
}

/**
 * 获取城市 adcode（用于天气 API）
 */
export function getCityAdcode(cityId: CityId): string | undefined {
  return getCityById(cityId)?.adcode
}

/**
 * 检查城市是否有数据可用
 */
export function isCityAvailable(cityId: CityId): boolean {
  return getCityById(cityId)?.available ?? false
}

/**
 * 根据 adcode 查找城市
 * 用于 IP 定位返回的 adcode 匹配
 */
export function getCityByAdcode(adcode: string): CityConfig | undefined {
  // 先精确匹配
  const exact = CITIES.find((city) => city.adcode === adcode)
  if (exact) return exact

  // 再匹配上级行政区（如 350100 匹配 350123）
  // adcode 前 4 位是市级代码
  const cityPrefix = adcode.slice(0, 4)
  return CITIES.find((city) => city.adcode.startsWith(cityPrefix))
}

/**
 * 根据坐标计算最近的城市
 * 使用简化的球面距离计算
 */
export function getNearestCity(coords: Coordinates): CityConfig {
  let nearest = CITIES[0]
  let minDistance = Infinity

  for (const city of CITIES) {
    const distance = calculateDistance(coords, city.coordinates)
    if (distance < minDistance) {
      minDistance = distance
      nearest = city
    }
  }

  return nearest
}

/**
 * 计算两点间的简化距离（用于比较，非精确距离）
 */
function calculateDistance(a: Coordinates, b: Coordinates): number {
  const latDiff = a.lat - b.lat
  const lngDiff = a.lng - b.lng
  // 简化计算，仅用于相对比较
  return latDiff * latDiff + lngDiff * lngDiff
}

/**
 * 验证是否为有效的 CityId
 */
export function isValidCityId(id: string): id is CityId {
  return CITIES.some((city) => city.id === id)
}
