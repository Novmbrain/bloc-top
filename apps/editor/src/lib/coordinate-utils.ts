/**
 * GCJ-02 / WGS-84 坐标转换工具
 *
 * DB 统一存储 WGS-84（国际标准），传给高德地图时转换为 GCJ-02。
 * 使用公开的 GCJ-02 偏移公式，纯本地计算，无网络依赖。
 */

import type { Coordinates } from '@bloctop/shared/types'

// ==================== 常量 ====================

/** WGS-84 长半轴 (m) */
const A = 6378245.0

/** GCJ-02 偏心率平方 */
const EE = 0.00669342162296594

/** 默认精度：6 位小数 ≈ 0.11m */
const DEFAULT_PRECISION = 6

/** 迭代逼近最大次数 */
const MAX_ITERATIONS = 5

/** 迭代收敛阈值 (约 0.01m) */
const CONVERGENCE_THRESHOLD = 1e-9

// ==================== 核心转换 ====================

/**
 * WGS-84 → GCJ-02 (火星坐标系)
 *
 * 传给高德地图 JS API、导航 URL 时使用。
 */
export function wgs84ToGcj02(coords: Coordinates): Coordinates {
  if (outOfChina(coords)) return coords

  const { dlng, dlat } = calcOffset(coords.lng - 105.0, coords.lat - 35.0)
  const radLat = (coords.lat / 180.0) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)

  const adjustedLat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * Math.PI)
  const adjustedLng = (dlng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * Math.PI)

  return {
    lng: coords.lng + adjustedLng,
    lat: coords.lat + adjustedLat,
  }
}

/**
 * GCJ-02 → WGS-84 (GPS 国际标准)
 *
 * 从高德坐标拾取器输入时，转换后存入 DB。
 * 使用迭代逼近法，精度 < 0.5m。
 */
export function gcj02ToWgs84(coords: Coordinates): Coordinates {
  if (outOfChina(coords)) return coords

  let wgsLng = coords.lng
  let wgsLat = coords.lat

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const gcj = wgs84ToGcj02({ lng: wgsLng, lat: wgsLat })
    const dLng = coords.lng - gcj.lng
    const dLat = coords.lat - gcj.lat

    wgsLng += dLng
    wgsLat += dLat

    if (Math.abs(dLng) < CONVERGENCE_THRESHOLD && Math.abs(dLat) < CONVERGENCE_THRESHOLD) {
      break
    }
  }

  return { lng: wgsLng, lat: wgsLat }
}

// ==================== 精度控制 ====================

/**
 * 截断坐标精度到指定小数位
 *
 * 高德 API 要求不超过 6 位小数。
 * 6 位 ≈ 0.11m，完全满足 POI 定位需求。
 */
export function truncateCoordinates(coords: Coordinates, precision = DEFAULT_PRECISION): Coordinates {
  const factor = Math.pow(10, precision)
  return {
    lng: Math.round(coords.lng * factor) / factor,
    lat: Math.round(coords.lat * factor) / factor,
  }
}

/**
 * 格式化单个坐标值为字符串
 */
export function formatCoordinate(value: number, precision = DEFAULT_PRECISION): string {
  return value.toFixed(precision)
}

// ==================== 验证 ====================

interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * 验证坐标合法性
 *
 * 检查：有效数字、合理范围（中国大致范围）
 */
export function validateCoordinates(coords: Coordinates): ValidationResult {
  if (isNaN(coords.lng) || isNaN(coords.lat)) {
    return { valid: false, error: '坐标值必须是有效数字' }
  }

  if (coords.lng < -180 || coords.lng > 180) {
    return { valid: false, error: '经度范围应在 -180 到 180 之间' }
  }

  if (coords.lat < -90 || coords.lat > 90) {
    return { valid: false, error: '纬度范围应在 -90 到 90 之间' }
  }

  // 中国大致范围警告（不阻止，只提示）
  if (outOfChina(coords)) {
    return { valid: true, error: '坐标不在中国范围内，GCJ-02 转换将不生效' }
  }

  return { valid: true }
}

// ==================== 内部工具函数 ====================

/** 判断坐标是否在中国境外 */
function outOfChina(coords: Coordinates): boolean {
  return coords.lng < 72.004 || coords.lng > 137.8347 || coords.lat < 0.8293 || coords.lat > 55.8271
}

/** 计算经纬度偏移量 */
function calcOffset(lng: number, lat: number): { dlng: number; dlat: number } {
  let dlng =
    300.0 +
    lng +
    2.0 * lat +
    0.1 * lng * lng +
    0.1 * lng * lat +
    0.1 * Math.sqrt(Math.abs(lng))
  dlng += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0
  dlng += ((20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin((lng / 3.0) * Math.PI)) * 2.0) / 3.0
  dlng += ((150.0 * Math.sin((lng / 12.0) * Math.PI) + 300.0 * Math.sin((lng / 30.0) * Math.PI)) * 2.0) / 3.0

  let dlat =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng))
  dlat += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0
  dlat += ((20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin((lat / 3.0) * Math.PI)) * 2.0) / 3.0
  dlat += ((160.0 * Math.sin((lat / 12.0) * Math.PI) + 320.0 * Math.sin((lat * Math.PI) / 30.0)) * 2.0) / 3.0

  return { dlng, dlat }
}
