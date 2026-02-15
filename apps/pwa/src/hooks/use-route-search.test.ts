import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRouteSearch, matchRouteByQuery, filterRoutesByQuery } from './use-route-search'
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

// ==================== 独立函数测试 ====================
// 这些函数可以在任何地方独立使用，确保线路页和首页使用相同的匹配逻辑

describe('matchRouteByQuery（独立匹配函数）', () => {
  const route: Route = { id: 1, name: '圆通寺', grade: 'V0', cragId: 'yuan-tong-si', area: '主区' }

  describe('中文匹配', () => {
    it('完全匹配返回类型1', () => {
      const match = matchRouteByQuery(route, '圆通寺')
      expect(match).not.toBeNull()
      expect(match?.type).toBe(1)
      expect(match?.position).toBe(0)
    })

    it('连续匹配返回类型2', () => {
      const match = matchRouteByQuery(route, '圆通')
      expect(match).not.toBeNull()
      expect(match?.type).toBe(2)
      expect(match?.position).toBe(0)
    })

    it('非连续匹配返回类型5', () => {
      const match = matchRouteByQuery(route, '圆寺')
      expect(match).not.toBeNull()
      expect(match?.type).toBe(5)
    })
  })

  describe('拼音匹配', () => {
    it('全拼匹配返回类型3', () => {
      const match = matchRouteByQuery(route, 'yuantongsi')
      expect(match).not.toBeNull()
      expect(match?.type).toBe(3)
    })

    it('首字母匹配返回类型3或4', () => {
      const match = matchRouteByQuery(route, 'yts')
      expect(match).not.toBeNull()
      // 「yts」匹配「圆通寺」所有三个字，算全拼匹配(3)
      expect(match?.type).toBe(3)
    })

    it('混合匹配返回类型3或4', () => {
      const match = matchRouteByQuery(route, 'yuants')
      expect(match).not.toBeNull()
      // 「yuants」匹配「圆通寺」所有三个字，算全拼匹配(3)
      expect(match?.type).toBe(3)
    })

    it('部分匹配返回类型4', () => {
      // 只匹配部分字符的情况
      const match = matchRouteByQuery(route, 'yuantong') // 只匹配「圆通」
      expect(match).not.toBeNull()
      expect(match?.type).toBe(4) // 部分匹配
    })
  })

  describe('边界情况', () => {
    it('空查询返回 null', () => {
      expect(matchRouteByQuery(route, '')).toBeNull()
      expect(matchRouteByQuery(route, '   ')).toBeNull()
    })

    it('不匹配返回 null', () => {
      expect(matchRouteByQuery(route, 'xyz')).toBeNull()
      expect(matchRouteByQuery(route, '不存在')).toBeNull()
    })

    it('空线路名返回 null', () => {
      const emptyRoute: Route = { id: 1, name: '', grade: 'V0', cragId: 'test', area: '' }
      expect(matchRouteByQuery(emptyRoute, '圆通')).toBeNull()
    })
  })
})

describe('filterRoutesByQuery（批量过滤函数）', () => {
  it('应该过滤并排序结果', () => {
    const results = filterRoutesByQuery(mockRoutes, '圆')
    expect(results.length).toBeGreaterThanOrEqual(2)
    // 「圆通寺」和「圆满」都应该匹配
    expect(results.some(r => r.name === '圆通寺')).toBe(true)
    expect(results.some(r => r.name === '圆满')).toBe(true)
  })

  it('应该支持 limit 参数', () => {
    const results = filterRoutesByQuery(mockRoutes, 'y', { limit: 1 })
    expect(results.length).toBe(1)
  })

  it('空查询应返回空数组', () => {
    const results = filterRoutesByQuery(mockRoutes, '')
    expect(results).toHaveLength(0)
  })

  it('拼音搜索应该工作', () => {
    const results = filterRoutesByQuery(mockRoutes, 'bjc')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].name).toBe('八井村')
  })
})
