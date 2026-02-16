import { describe, it, expect } from 'vitest'
import {
  catmullRomCurve,
  scalePoints,
  normalizePoint,
  generateRouteColor,
  generateRouteId,
} from './topo-utils'

describe('topo-utils', () => {
  describe('catmullRomCurve', () => {
    it('should return empty string for less than 2 points', () => {
      expect(catmullRomCurve([])).toBe('')
      expect(catmullRomCurve([{ x: 0, y: 0 }])).toBe('')
    })

    it('should return straight line for 2 points', () => {
      const result = catmullRomCurve([
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ])
      expect(result).toBe('M 0 0 L 100 100')
    })

    it('should use cubic bezier C commands for 3+ points', () => {
      const result = catmullRomCurve([
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 },
      ])
      expect(result).toContain('M 0 0')
      expect(result).toContain('C') // 三次贝塞尔曲线
      expect(result).not.toContain('Q') // 不再使用二次贝塞尔
    })

    it('should pass through all input points (interpolation guarantee)', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 50 },
        { x: 150, y: 0 },
      ]
      const result = catmullRomCurve(points)

      // 起点是 M 命令
      expect(result).toContain('M 0 0')

      // 每个后续点应出现在 C 命令的终点位置
      // C cp1x cp1y cp2x cp2y endX endY
      for (let i = 1; i < points.length; i++) {
        expect(result).toContain(`${points[i].x} ${points[i].y}`)
      }
    })

    it('should generate correct number of C segments', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 25, y: 50 },
        { x: 50, y: 75 },
        { x: 75, y: 50 },
        { x: 100, y: 0 },
      ]
      const result = catmullRomCurve(points)

      // 应该有 n-1 个 C 命令（points.length - 1 个段）
      const cCount = (result.match(/ C /g) || []).length
      expect(cCount).toBe(4)
    })

    it('should degenerate to polyline when tension=1', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 },
      ]
      const result = catmullRomCurve(points, 0.5, 1)

      // tension=1 时，切线为零，控制点与端点重合
      // C 命令的 cp1 ≈ P1, cp2 ≈ P2 → 近似直线
      // 解析每个 C 段验证控制点接近端点
      const segments = result.split(' C ').slice(1)
      for (const seg of segments) {
        const nums = seg.split(' ').map(Number)
        // cp1x, cp1y, cp2x, cp2y, endX, endY
        const [cp1x, cp1y, cp2x, cp2y, endX, endY] = nums
        // cp2 应接近终点
        expect(cp2x).toBeCloseTo(endX, 5)
        expect(cp2y).toBeCloseTo(endY, 5)
      }
    })

    it('should handle coincident points without error', () => {
      // 两个相同的点不应导致除零
      const points = [
        { x: 50, y: 50 },
        { x: 50, y: 50 },
        { x: 100, y: 100 },
      ]
      const result = catmullRomCurve(points)
      expect(result).toBeDefined()
      expect(result).toContain('M 50 50')
      // 不应包含 NaN 或 Infinity
      expect(result).not.toContain('NaN')
      expect(result).not.toContain('Infinity')
    })

    it('should support different alpha values', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 },
      ]
      // uniform (alpha=0), centripetal (alpha=0.5), chordal (alpha=1)
      const uniform = catmullRomCurve(points, 0)
      const centripetal = catmullRomCurve(points, 0.5)
      const chordal = catmullRomCurve(points, 1)

      // 所有变体都应穿过终点
      expect(uniform).toContain('100 0')
      expect(centripetal).toContain('100 0')
      expect(chordal).toContain('100 0')

      // 不同 alpha 应产生不同的控制点
      expect(uniform).not.toBe(centripetal)
      expect(centripetal).not.toBe(chordal)
    })

    it('should produce smooth curve for rectangle corner points', () => {
      // 这是旧算法最大的痛点：标注矩形四角，曲线不穿过角点
      const rectangle = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]
      const result = catmullRomCurve(rectangle)

      // 每个角点都必须精确出现在路径中
      expect(result).toContain('M 0 0')
      expect(result).toContain('100 0')
      expect(result).toContain('100 100')
      expect(result).toContain('0 100')
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
