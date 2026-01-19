import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRouteSearch } from './use-route-search'
import type { Route } from '@/types'

// 测试数据
const mockRoutes: Route[] = [
  { id: 1, name: '圆通寺', grade: 'V0', cragId: 'yuan-tong-si', area: '主区' },
  { id: 2, name: '八井村', grade: 'V1', cragId: 'ba-jing-cun', area: '东区' },
  { id: 3, name: '飞来石', grade: 'V2', cragId: 'yuan-tong-si', area: '西区' },
  { id: 4, name: '云台山', grade: 'V3', cragId: 'ba-jing-cun', area: '北区' },
  { id: 5, name: '圆满', grade: 'V4', cragId: 'yuan-tong-si', area: '南区' },
]

describe('useRouteSearch', () => {
  describe('中文搜索', () => {
    it('应该支持中文完全匹配', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('圆通寺')
      })

      expect(result.current.searchResults).toHaveLength(1)
      expect(result.current.searchResults[0].name).toBe('圆通寺')
    })

    it('应该支持中文连续部分匹配', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('圆通')
      })

      expect(result.current.searchResults).toHaveLength(1)
      expect(result.current.searchResults[0].name).toBe('圆通寺')
    })

    it('应该支持中文非连续匹配', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('圆寺')
      })

      expect(result.current.searchResults).toHaveLength(1)
      expect(result.current.searchResults[0].name).toBe('圆通寺')
    })
  })

  describe('拼音搜索', () => {
    it('应该支持拼音全拼匹配', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('yuantongsi')
      })

      expect(result.current.searchResults).toHaveLength(1)
      expect(result.current.searchResults[0].name).toBe('圆通寺')
    })

    it('应该支持拼音首字母匹配', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('yts')
      })

      // 应该匹配「圆通寺」和「云台山」
      expect(result.current.searchResults.length).toBeGreaterThanOrEqual(1)
      expect(result.current.searchResults.some(r => r.name === '圆通寺')).toBe(true)
    })

    it('应该支持拼音部分匹配', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('yuantong')
      })

      expect(result.current.searchResults.length).toBeGreaterThanOrEqual(1)
      expect(result.current.searchResults[0].name).toBe('圆通寺')
    })

    it('应该支持拼音混合匹配（全拼+首字母）', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('yuants')
      })

      expect(result.current.searchResults.length).toBeGreaterThanOrEqual(1)
      expect(result.current.searchResults[0].name).toBe('圆通寺')
    })

    it('应该匹配「八井村」的拼音', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('bjc')
      })

      expect(result.current.searchResults.length).toBeGreaterThanOrEqual(1)
      expect(result.current.searchResults[0].name).toBe('八井村')
    })
  })

  describe('优先级排序', () => {
    it('中文完全匹配应该优先于拼音匹配', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      // 搜索「圆」应该先匹配中文连续，再匹配拼音
      act(() => {
        result.current.setSearchQuery('圆')
      })

      // 「圆通寺」和「圆满」都应该匹配
      expect(result.current.searchResults.length).toBeGreaterThanOrEqual(2)
    })

    it('不匹配的查询应该返回空结果', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('xyz')
      })

      expect(result.current.searchResults).toHaveLength(0)
    })
  })

  describe('基本功能', () => {
    it('空查询应该返回空结果', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      expect(result.current.searchResults).toHaveLength(0)
      expect(result.current.hasResults).toBe(false)
    })

    it('clearSearch 应该清空查询', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 0 }))

      act(() => {
        result.current.setSearchQuery('圆通')
      })
      expect(result.current.searchResults.length).toBeGreaterThan(0)

      act(() => {
        result.current.clearSearch()
      })
      expect(result.current.searchQuery).toBe('')
      expect(result.current.searchResults).toHaveLength(0)
    })

    it('limit 参数应该限制结果数量', () => {
      const { result } = renderHook(() => useRouteSearch(mockRoutes, { limit: 2 }))

      act(() => {
        result.current.setSearchQuery('y') // 会匹配多个拼音
      })

      expect(result.current.searchResults.length).toBeLessThanOrEqual(2)
    })
  })
})
