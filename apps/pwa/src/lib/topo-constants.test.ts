import { describe, it, expect } from 'vitest'
import {
  TOPO_VIEW_WIDTH,
  TOPO_VIEW_HEIGHT,
  TOPO_LINE_CONFIG,
  TOPO_MARKER_CONFIG,
  TOPO_ANIMATION_CONFIG,
} from './topo-constants'

describe('topo-constants', () => {
  describe('viewBox dimensions', () => {
    it('should have positive width and height', () => {
      expect(TOPO_VIEW_WIDTH).toBeGreaterThan(0)
      expect(TOPO_VIEW_HEIGHT).toBeGreaterThan(0)
    })

    it('should maintain 4:3 aspect ratio', () => {
      const ratio = TOPO_VIEW_WIDTH / TOPO_VIEW_HEIGHT
      expect(ratio).toBeCloseTo(4 / 3, 2)
    })

    it('should have reasonable dimensions for SVG rendering', () => {
      // 太小会导致精度问题，太大会影响性能
      expect(TOPO_VIEW_WIDTH).toBeGreaterThanOrEqual(100)
      expect(TOPO_VIEW_WIDTH).toBeLessThanOrEqual(1000)
      expect(TOPO_VIEW_HEIGHT).toBeGreaterThanOrEqual(100)
      expect(TOPO_VIEW_HEIGHT).toBeLessThanOrEqual(1000)
    })
  })

  describe('TOPO_LINE_CONFIG', () => {
    it('should have valid strokeWidth', () => {
      expect(TOPO_LINE_CONFIG.strokeWidth).toBeGreaterThan(0)
      expect(Number.isInteger(TOPO_LINE_CONFIG.strokeWidth) ||
        Number.isFinite(TOPO_LINE_CONFIG.strokeWidth)).toBe(true)
    })

    it('should have outlineWidth larger than strokeWidth for visibility', () => {
      expect(TOPO_LINE_CONFIG.outlineWidth).toBeGreaterThan(
        TOPO_LINE_CONFIG.strokeWidth
      )
    })

    it('should have valid outlineOpacity between 0 and 1', () => {
      expect(TOPO_LINE_CONFIG.outlineOpacity).toBeGreaterThan(0)
      expect(TOPO_LINE_CONFIG.outlineOpacity).toBeLessThanOrEqual(1)
    })

    it('should have valid SVG linecap value', () => {
      const validLinecaps = ['round', 'square', 'butt']
      expect(validLinecaps).toContain(TOPO_LINE_CONFIG.strokeLinecap)
    })

    it('should have valid SVG linejoin value', () => {
      const validLinejoins = ['round', 'bevel', 'miter']
      expect(validLinejoins).toContain(TOPO_LINE_CONFIG.strokeLinejoin)
    })

    it('should use round linecap for smooth endpoints', () => {
      // 对于攀岩线路，round 是最佳选择
      expect(TOPO_LINE_CONFIG.strokeLinecap).toBe('round')
    })
  })

  describe('TOPO_MARKER_CONFIG', () => {
    it('should have positive radius values', () => {
      expect(TOPO_MARKER_CONFIG.startRadius).toBeGreaterThan(0)
      expect(TOPO_MARKER_CONFIG.endRadius).toBeGreaterThan(0)
    })

    it('should have start radius >= end radius for visual hierarchy', () => {
      // 起点应该比终点更突出（等于或更大）
      expect(TOPO_MARKER_CONFIG.startRadius).toBeGreaterThanOrEqual(
        TOPO_MARKER_CONFIG.endRadius
      )
    })

    it('should have valid stroke widths', () => {
      expect(TOPO_MARKER_CONFIG.strokeWidth).toBeGreaterThan(0)
      expect(TOPO_MARKER_CONFIG.endStrokeWidth).toBeGreaterThan(0)
    })

    it('should have reasonable marker sizes relative to viewBox', () => {
      // 标记点不应该太大（超过 viewBox 的 10%）
      const maxReasonableRadius = Math.min(TOPO_VIEW_WIDTH, TOPO_VIEW_HEIGHT) * 0.1
      expect(TOPO_MARKER_CONFIG.startRadius).toBeLessThan(maxReasonableRadius)
      expect(TOPO_MARKER_CONFIG.endRadius).toBeLessThan(maxReasonableRadius)
    })
  })

  describe('TOPO_ANIMATION_CONFIG', () => {
    it('should have valid CSS duration format', () => {
      // 应该是 "0.8s" 或 "800ms" 这样的格式
      expect(TOPO_ANIMATION_CONFIG.duration).toMatch(/^\d+(\.\d+)?(s|ms)$/)
    })

    it('should have positive delay values', () => {
      expect(TOPO_ANIMATION_CONFIG.autoPlayDelayDrawer).toBeGreaterThan(0)
      expect(TOPO_ANIMATION_CONFIG.autoPlayDelayFullscreen).toBeGreaterThan(0)
    })

    it('should have reasonable delay values (under 2 seconds)', () => {
      expect(TOPO_ANIMATION_CONFIG.autoPlayDelayDrawer).toBeLessThan(2000)
      expect(TOPO_ANIMATION_CONFIG.autoPlayDelayFullscreen).toBeLessThan(2000)
    })

    it('should have valid CSS easing function', () => {
      const validEasings = [
        'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out',
      ]
      // 也可以是 cubic-bezier()
      const isValidEasing = validEasings.includes(TOPO_ANIMATION_CONFIG.easing) ||
        TOPO_ANIMATION_CONFIG.easing.startsWith('cubic-bezier')
      expect(isValidEasing).toBe(true)
    })

    it('should have fullscreen delay >= drawer delay', () => {
      // 全屏模式需要更多时间让用户定位
      expect(TOPO_ANIMATION_CONFIG.autoPlayDelayFullscreen).toBeGreaterThanOrEqual(
        TOPO_ANIMATION_CONFIG.autoPlayDelayDrawer
      )
    })
  })

  // 注意：类型安全由 TypeScript 在编译时保证 (as const)
  // 运行时不会抛出错误，因此不需要运行时测试
  // 如需运行时不可变，应使用 Object.freeze()
})
