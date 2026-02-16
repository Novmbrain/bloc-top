/**
 * 坐标工具函数
 *
 * DB 统一存储 GCJ-02 (火星坐标系)。
 * 高德地图 JS API 和高德坐标拾取器均使用 GCJ-02，无需转换。
 */

import type { Coordinates } from './types/index'

const DEFAULT_PRECISION = 6

/**
 * 解析坐标粘贴输入
 * Supports: "119.306239,26.063477", "119.306239, 26.063477", "119.306239 26.063477"
 * @returns parsed Coordinates or null if invalid
 */
export function parseCoordinateInput(input: string): Coordinates | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const parts = trimmed.includes(',')
    ? trimmed.split(',').map((s) => s.trim())
    : trimmed.split(/\s+/)

  if (parts.length !== 2) return null

  const lng = parseFloat(parts[0])
  const lat = parseFloat(parts[1])

  if (isNaN(lng) || isNaN(lat)) return null

  return { lng, lat }
}

export function truncateCoordinates(coords: Coordinates, precision = DEFAULT_PRECISION): Coordinates {
  const factor = Math.pow(10, precision)
  return {
    lng: Math.round(coords.lng * factor) / factor,
    lat: Math.round(coords.lat * factor) / factor,
  }
}

/**
 * Format coordinates as "lng,lat" display string (高德拾取器格式)
 */
export function formatCoordinateDisplay(coords: Coordinates, precision = DEFAULT_PRECISION): string {
  return `${coords.lng.toFixed(precision)},${coords.lat.toFixed(precision)}`
}

export function formatCoordinate(value: number, precision = DEFAULT_PRECISION): string {
  return value.toFixed(precision)
}

interface ValidationResult {
  valid: boolean
  error?: string
}

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

  if (coords.lng < 72.004 || coords.lng > 137.8347 || coords.lat < 0.8293 || coords.lat > 55.8271) {
    return { valid: true, error: '坐标不在中国范围内' }
  }

  return { valid: true }
}
