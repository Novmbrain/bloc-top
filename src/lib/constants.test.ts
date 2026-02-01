import { describe, it, expect } from 'vitest'
import { IMAGE_VERSION, getRouteTopoUrl, getCragCoverUrl, getFaceTopoUrl, getTopoImageUrl } from './constants'
import type { Route } from '@/types'

describe('constants', () => {
  describe('IMAGE_VERSION', () => {
    it('应该是有效的版本号字符串', () => {
      expect(typeof IMAGE_VERSION).toBe('string')
      expect(IMAGE_VERSION.length).toBeGreaterThan(0)
    })
  })

  describe('getRouteTopoUrl', () => {
    it('应该构建正确的 URL', () => {
      const url = getRouteTopoUrl('yuan-tong-si', '月光')
      expect(url).toBe(
        `https://img.bouldering.top/yuan-tong-si/${encodeURIComponent('月光')}.jpg?v=${IMAGE_VERSION}`
      )
    })

    it('应该正确编码中文线路名', () => {
      const url = getRouteTopoUrl('ba-jing-cun', '坐立难度')
      expect(url).toContain(encodeURIComponent('坐立难度'))
      expect(url).toContain('.jpg?v=')
    })

    it('应该正确编码特殊字符', () => {
      const url = getRouteTopoUrl('test-crag', 'Route #1 & Test')
      expect(url).toContain(encodeURIComponent('Route #1 & Test'))
    })

    it('应该包含版本号参数', () => {
      const url = getRouteTopoUrl('any-crag', 'any-route')
      expect(url).toContain(`?v=${IMAGE_VERSION}`)
    })

    it('应该使用正确的基础 URL', () => {
      const url = getRouteTopoUrl('crag-id', 'route-name')
      expect(url).toMatch(/^https:\/\/img\.bouldering\.top\//)
    })

    it('应该处理空格', () => {
      const url = getRouteTopoUrl('crag', 'route with spaces')
      expect(url).toContain('route%20with%20spaces')
    })

    it('应该支持时间戳参数用于缓存刷新', () => {
      const timestamp = 1705981200123
      const url = getRouteTopoUrl('yuan-tong-si', '月光', timestamp)
      expect(url).toContain(`?t=${timestamp}`)
      expect(url).not.toContain('?v=')
    })

    it('不带时间戳时应使用静态版本号', () => {
      const url = getRouteTopoUrl('yuan-tong-si', '月光')
      expect(url).toContain(`?v=${IMAGE_VERSION}`)
      expect(url).not.toContain('?t=')
    })
  })

  describe('getCragCoverUrl', () => {
    it('应该构建正确的 URL', () => {
      const url = getCragCoverUrl('yuan-tong-si', 0)
      expect(url).toBe(
        `https://img.bouldering.top/CragSurface/yuan-tong-si/0.jpg?v=${IMAGE_VERSION}`
      )
    })

    it('应该支持不同的索引', () => {
      expect(getCragCoverUrl('test', 0)).toContain('/0.jpg')
      expect(getCragCoverUrl('test', 1)).toContain('/1.jpg')
      expect(getCragCoverUrl('test', 5)).toContain('/5.jpg')
    })

    it('应该包含版本号参数', () => {
      const url = getCragCoverUrl('any-crag', 0)
      expect(url).toContain(`?v=${IMAGE_VERSION}`)
    })

    it('应该使用 CragSurface 路径', () => {
      const url = getCragCoverUrl('crag-id', 0)
      expect(url).toContain('/CragSurface/')
    })

    it('应该使用正确的基础 URL', () => {
      const url = getCragCoverUrl('crag-id', 0)
      expect(url).toMatch(/^https:\/\/img\.bouldering\.top\//)
    })
  })

  describe('getFaceTopoUrl', () => {
    it('should generate face URL with encoded area and faceId', () => {
      const url = getFaceTopoUrl('crag1', '左侧区域', 'face-1')
      expect(url).toContain(encodeURIComponent('左侧区域'))
      expect(url).toContain('face-1.jpg')
      expect(url).toContain(`v=${IMAGE_VERSION}`)
    })

    it('should use timestamp when provided', () => {
      const url = getFaceTopoUrl('crag1', 'area', 'face1', 999)
      expect(url).toContain('t=999')
      expect(url).not.toContain('v=')
    })
  })

  describe('getTopoImageUrl', () => {
    it('should use face URL when faceId and area exist', () => {
      const route = { cragId: 'c1', name: 'r1', area: 'left', faceId: 'f1' } as Route
      const url = getTopoImageUrl(route)
      expect(url).toContain('c1/left/f1.jpg')
    })

    it('should fall back to route URL when no faceId', () => {
      const route = { cragId: 'c1', name: 'r1', area: 'left' } as Route
      const url = getTopoImageUrl(route)
      expect(url).toContain('c1/r1.jpg')
    })

    it('should fall back to route URL when no area', () => {
      const route = { cragId: 'c1', name: 'r1', faceId: 'f1' } as Route
      const url = getTopoImageUrl(route)
      expect(url).toContain('c1/r1.jpg')
    })

    it('should pass timestamp through', () => {
      const route = { cragId: 'c1', name: 'r1', area: 'a', faceId: 'f1' } as Route
      const url = getTopoImageUrl(route, 12345)
      expect(url).toContain('t=12345')
    })
  })
})
