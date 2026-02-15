import { describe, it, expect } from 'vitest'
import {
  wgs84ToGcj02,
  gcj02ToWgs84,
  truncateCoordinates,
  formatCoordinate,
  validateCoordinates,
} from './coordinate-utils'

// 已知参考坐标对 (来源: coordtransform 等开源库的测试用例)
// 北京天安门: WGS-84 (116.3912757, 39.9075838) → GCJ-02 (116.3975590, 39.9087200) 大约
const BEIJING_WGS84 = { lng: 116.3912757, lat: 39.9075838 }
const BEIJING_GCJ02_EXPECTED = { lng: 116.39775, lat: 39.90892 } // 近似值，容差 0.001°

// 罗源圆通寺 (当前硬编码值，假设为 GCJ-02)
const YUANTONGSI_GCJ02 = { lng: 119.52508494257924, lat: 26.47524770432985 }

describe('coordinate-utils', () => {
  describe('wgs84ToGcj02', () => {
    it('should convert WGS-84 to GCJ-02 with reasonable offset', () => {
      const result = wgs84ToGcj02(BEIJING_WGS84)

      // 偏移量应在合理范围 (0.001° ~ 0.01°，大约 100-1000m)
      expect(Math.abs(result.lng - BEIJING_WGS84.lng)).toBeGreaterThan(0.001)
      expect(Math.abs(result.lng - BEIJING_WGS84.lng)).toBeLessThan(0.01)
      expect(Math.abs(result.lat - BEIJING_WGS84.lat)).toBeGreaterThan(0.0005)
      expect(Math.abs(result.lat - BEIJING_WGS84.lat)).toBeLessThan(0.01)

      // 与已知近似值比较 (容差 0.002°)
      expect(result.lng).toBeCloseTo(BEIJING_GCJ02_EXPECTED.lng, 2)
      expect(result.lat).toBeCloseTo(BEIJING_GCJ02_EXPECTED.lat, 2)
    })

    it('should not convert coordinates outside China', () => {
      const tokyo = { lng: 139.6917, lat: 35.6895 }
      const result = wgs84ToGcj02(tokyo)
      expect(result.lng).toBe(tokyo.lng)
      expect(result.lat).toBe(tokyo.lat)
    })

    it('should handle coordinates at China border', () => {
      const guangzhou = { lng: 113.264, lat: 23.1291 }
      const result = wgs84ToGcj02(guangzhou)
      // 应该有偏移
      expect(result.lng).not.toBe(guangzhou.lng)
      expect(result.lat).not.toBe(guangzhou.lat)
    })
  })

  describe('gcj02ToWgs84', () => {
    it('should reverse GCJ-02 back to WGS-84 with high precision', () => {
      // 先正向转换，再反向转换，应接近原始值
      const gcj02 = wgs84ToGcj02(BEIJING_WGS84)
      const wgs84 = gcj02ToWgs84(gcj02)

      // 往返精度 < 0.000001° (约 0.1m)
      expect(Math.abs(wgs84.lng - BEIJING_WGS84.lng)).toBeLessThan(0.000001)
      expect(Math.abs(wgs84.lat - BEIJING_WGS84.lat)).toBeLessThan(0.000001)
    })

    it('should convert 圆通寺 GCJ-02 coordinates to WGS-84', () => {
      const wgs84 = gcj02ToWgs84(YUANTONGSI_GCJ02)

      // WGS-84 应与 GCJ-02 不同
      expect(wgs84.lng).not.toBe(YUANTONGSI_GCJ02.lng)
      expect(wgs84.lat).not.toBe(YUANTONGSI_GCJ02.lat)

      // 偏移量合理 (福建地区偏移约 0.003-0.006°)
      expect(Math.abs(wgs84.lng - YUANTONGSI_GCJ02.lng)).toBeLessThan(0.01)
      expect(Math.abs(wgs84.lat - YUANTONGSI_GCJ02.lat)).toBeLessThan(0.01)

      // 正向验证：转回 GCJ-02 应接近原始值
      const backToGcj02 = wgs84ToGcj02(wgs84)
      expect(Math.abs(backToGcj02.lng - YUANTONGSI_GCJ02.lng)).toBeLessThan(0.000001)
      expect(Math.abs(backToGcj02.lat - YUANTONGSI_GCJ02.lat)).toBeLessThan(0.000001)
    })

    it('should not convert coordinates outside China', () => {
      const paris = { lng: 2.3522, lat: 48.8566 }
      const result = gcj02ToWgs84(paris)
      expect(result.lng).toBe(paris.lng)
      expect(result.lat).toBe(paris.lat)
    })
  })

  describe('roundtrip consistency', () => {
    const testPoints = [
      { lng: 119.549, lat: 26.489 },   // 罗源
      { lng: 118.089, lat: 24.479 },   // 厦门
      { lng: 121.4737, lat: 31.2304 }, // 上海
      { lng: 104.0657, lat: 30.5723 }, // 成都
    ]

    testPoints.forEach((point) => {
      it(`roundtrip for (${point.lng}, ${point.lat}) should have < 0.1m error`, () => {
        const gcj02 = wgs84ToGcj02(point)
        const back = gcj02ToWgs84(gcj02)
        expect(Math.abs(back.lng - point.lng)).toBeLessThan(0.000001)
        expect(Math.abs(back.lat - point.lat)).toBeLessThan(0.000001)
      })
    })
  })

  describe('truncateCoordinates', () => {
    it('should truncate to 6 decimal places by default', () => {
      const result = truncateCoordinates({ lng: 119.52508494257924, lat: 26.47524770432985 })
      expect(result.lng).toBe(119.525085)
      expect(result.lat).toBe(26.475248)
    })

    it('should truncate to specified precision', () => {
      const result = truncateCoordinates({ lng: 119.52508494, lat: 26.47524770 }, 3)
      expect(result.lng).toBe(119.525)
      expect(result.lat).toBe(26.475)
    })

    it('should handle already-short coordinates', () => {
      const result = truncateCoordinates({ lng: 119.55, lat: 26.44 })
      expect(result.lng).toBe(119.55)
      expect(result.lat).toBe(26.44)
    })
  })

  describe('formatCoordinate', () => {
    it('should format to 6 decimal places by default', () => {
      expect(formatCoordinate(119.55)).toBe('119.550000')
    })

    it('should format to specified precision', () => {
      expect(formatCoordinate(119.5501, 3)).toBe('119.550')
    })
  })

  describe('validateCoordinates', () => {
    it('should accept valid Chinese coordinates', () => {
      const result = validateCoordinates({ lng: 119.549, lat: 26.489 })
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject NaN values', () => {
      const result = validateCoordinates({ lng: NaN, lat: 26.489 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('有效数字')
    })

    it('should reject out-of-range longitude', () => {
      const result = validateCoordinates({ lng: 200, lat: 26.489 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('经度')
    })

    it('should reject out-of-range latitude', () => {
      const result = validateCoordinates({ lng: 119.549, lat: -100 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('纬度')
    })

    it('should warn for coordinates outside China', () => {
      const result = validateCoordinates({ lng: 2.3522, lat: 48.8566 })
      expect(result.valid).toBe(true) // 仍然有效，只是警告
      expect(result.error).toContain('中国范围')
    })
  })
})
