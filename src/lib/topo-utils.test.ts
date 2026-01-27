import { describe, it, expect } from 'vitest'
import {
  bezierCurve,
  scalePoints,
  normalizePoint,
  generateRouteColor,
  generateRouteId,
} from './topo-utils'

describe('topo-utils', () => {
  describe('bezierCurve', () => {
    it('should return empty string for less than 2 points', () => {
      expect(bezierCurve([])).toBe('')
      expect(bezierCurve([{ x: 0, y: 0 }])).toBe('')
    })

    it('should return straight line for 2 points', () => {
      const result = bezierCurve([
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ])
      expect(result).toBe('M 0 0 L 100 100')
    })

    it('should return quadratic bezier curve for 3 points', () => {
      const result = bezierCurve([
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 },
      ])
      expect(result).toContain('M 0 0')
      expect(result).toContain('Q') // 二次贝塞尔曲线
      expect(result).toContain('T') // 平滑连接
    })

    it('should calculate correct midpoint for curve endpoint', () => {
      const result = bezierCurve([
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 },
      ])
      // 中点应该是 (50+100)/2=75, (100+0)/2=50
      expect(result).toContain('75 50')
    })

    it('should handle multiple control points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 25, y: 50 },
        { x: 50, y: 75 },
        { x: 75, y: 50 },
        { x: 100, y: 0 },
      ]
      const result = bezierCurve(points)

      // 应该有 3 个 Q 命令 (点数-2)
      const qCount = (result.match(/Q/g) || []).length
      expect(qCount).toBe(3)
    })

    it('should round coordinates in Q commands', () => {
      const result = bezierCurve([
        { x: 0.123, y: 0.456 },
        { x: 50.789, y: 100.111 },
        { x: 100.999, y: 0.001 },
      ])
      // Q 命令中的坐标应该被取整
      expect(result).toContain('Q 51 100')
    })
  })

  describe('scalePoints', () => {
    it('should scale normalized points to target dimensions', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ]
      const result = scalePoints(points, 400, 300)

      expect(result[0]).toEqual({ x: 0, y: 0 })
      expect(result[1]).toEqual({ x: 200, y: 150 })
      expect(result[2]).toEqual({ x: 400, y: 300 })
    })

    it('should handle empty array', () => {
      expect(scalePoints([], 100, 100)).toEqual([])
    })

    it('should handle decimal scaling', () => {
      const points = [{ x: 0.333, y: 0.666 }]
      const result = scalePoints(points, 300, 300)

      expect(result[0].x).toBeCloseTo(99.9, 1)
      expect(result[0].y).toBeCloseTo(199.8, 1)
    })

    it('should preserve point count', () => {
      const points = [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
        { x: 0.5, y: 0.6 },
      ]
      const result = scalePoints(points, 100, 100)
      expect(result.length).toBe(points.length)
    })
  })

  describe('normalizePoint', () => {
    it('should normalize coordinates to 0-1 range', () => {
      expect(normalizePoint(200, 150, 400, 300)).toEqual({ x: 0.5, y: 0.5 })
      expect(normalizePoint(0, 0, 400, 300)).toEqual({ x: 0, y: 0 })
      expect(normalizePoint(400, 300, 400, 300)).toEqual({ x: 1, y: 1 })
    })

    it('should clamp negative values to 0', () => {
      const result = normalizePoint(-50, -50, 400, 300)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('should clamp values exceeding dimensions to 1', () => {
      const result = normalizePoint(500, 400, 400, 300)
      expect(result.x).toBe(1)
      expect(result.y).toBe(1)
    })

    it('should handle edge cases at boundaries', () => {
      // 刚好在边界
      expect(normalizePoint(0, 0, 400, 300)).toEqual({ x: 0, y: 0 })
      expect(normalizePoint(400, 300, 400, 300)).toEqual({ x: 1, y: 1 })
    })
  })

  describe('generateRouteColor', () => {
    it('should return a valid hex color', () => {
      const color = generateRouteColor()
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should return colors from predefined palette', () => {
      const validColors = [
        '#22C55E', '#3B82F6', '#F97316', '#EF4444',
        '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B',
      ]

      // 生成多次，验证都在有效颜色列表中
      for (let i = 0; i < 20; i++) {
        const color = generateRouteColor()
        expect(validColors).toContain(color)
      }
    })
  })

  describe('generateRouteId', () => {
    it('should return unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateRouteId())
      }
      expect(ids.size).toBe(100)
    })

    it('should follow route-{timestamp}-{random} format', () => {
      const id = generateRouteId()
      expect(id).toMatch(/^route-\d+-[a-z0-9]+$/)
    })

    it('should have timestamp component', () => {
      const before = Date.now()
      const id = generateRouteId()
      const after = Date.now()

      const timestamp = parseInt(id.split('-')[1])
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })
})
