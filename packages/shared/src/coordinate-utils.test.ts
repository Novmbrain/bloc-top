import { describe, it, expect } from 'vitest'
import {
  parseCoordinateInput,
  validateCoordinates,
  truncateCoordinates,
  formatCoordinate,
  formatCoordinateDisplay,
} from './coordinate-utils'

describe('coordinate-utils', () => {
  describe('parseCoordinateInput', () => {
    it('should parse comma-separated "lng,lat"', () => {
      const result = parseCoordinateInput('119.306239,26.063477')
      expect(result).toEqual({ lng: 119.306239, lat: 26.063477 })
    })

    it('should parse with space after comma "lng, lat"', () => {
      const result = parseCoordinateInput('119.306239, 26.063477')
      expect(result).toEqual({ lng: 119.306239, lat: 26.063477 })
    })

    it('should parse space-separated "lng lat"', () => {
      const result = parseCoordinateInput('119.306239 26.063477')
      expect(result).toEqual({ lng: 119.306239, lat: 26.063477 })
    })

    it('should trim whitespace', () => {
      const result = parseCoordinateInput('  119.306239, 26.063477  ')
      expect(result).toEqual({ lng: 119.306239, lat: 26.063477 })
    })

    it('should return null for empty string', () => {
      expect(parseCoordinateInput('')).toBeNull()
      expect(parseCoordinateInput('  ')).toBeNull()
    })

    it('should return null for single number', () => {
      expect(parseCoordinateInput('119.306239')).toBeNull()
    })

    it('should return null for non-numeric input', () => {
      expect(parseCoordinateInput('abc,def')).toBeNull()
    })

    it('should return null for too many values', () => {
      expect(parseCoordinateInput('119.3,26.0,100')).toBeNull()
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
      expect(result.valid).toBe(true)
      expect(result.error).toContain('中国范围')
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
  })

  describe('formatCoordinate', () => {
    it('should format to 6 decimal places by default', () => {
      expect(formatCoordinate(119.55)).toBe('119.550000')
    })

    it('should format to specified precision', () => {
      expect(formatCoordinate(119.5501, 3)).toBe('119.550')
    })
  })

  describe('formatCoordinateDisplay', () => {
    it('should format as lng,lat string', () => {
      expect(formatCoordinateDisplay({ lng: 119.306239, lat: 26.063477 })).toBe('119.306239,26.063477')
    })

    it('should respect precision parameter', () => {
      expect(formatCoordinateDisplay({ lng: 119.306239, lat: 26.063477 }, 3)).toBe('119.306,26.063')
    })
  })
})
