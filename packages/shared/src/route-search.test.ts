import { describe, it, expect } from 'vitest'
import { matchRouteByQuery, filterRoutesByQuery } from './route-search'
import type { Route } from './types'

// 测试数据
const mockRoutes: Route[] = [
  { id: 1, name: '圆通寺', grade: 'V0', cragId: 'yuan-tong-si', area: '主区' },
  { id: 2, name: '八井村', grade: 'V1', cragId: 'ba-jing-cun', area: '东区' },
  { id: 3, name: '飞来石', grade: 'V2', cragId: 'yuan-tong-si', area: '西区' },
  { id: 4, name: '云台山', grade: 'V3', cragId: 'ba-jing-cun', area: '北区' },
  { id: 5, name: '圆满', grade: 'V4', cragId: 'yuan-tong-si', area: '南区' },
]

// ==================== matchRouteByQuery ====================

describe('matchRouteByQuery', () => {
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

    it('首字母匹配返回类型3（全字符匹配时）', () => {
      const match = matchRouteByQuery(route, 'yts')
      expect(match).not.toBeNull()
      expect(match?.type).toBe(3)
    })

    it('混合匹配返回类型3（全字符匹配时）', () => {
      const match = matchRouteByQuery(route, 'yuants')
      expect(match).not.toBeNull()
      expect(match?.type).toBe(3)
    })

    it('部分匹配返回类型4', () => {
      const match = matchRouteByQuery(route, 'yuantong')
      expect(match).not.toBeNull()
      expect(match?.type).toBe(4)
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

// ==================== filterRoutesByQuery ====================

describe('filterRoutesByQuery', () => {
  it('中文搜索应匹配多个结果', () => {
    const results = filterRoutesByQuery(mockRoutes, '圆')
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results.some(r => r.name === '圆通寺')).toBe(true)
    expect(results.some(r => r.name === '圆满')).toBe(true)
  })

  it('应支持 limit 参数', () => {
    const results = filterRoutesByQuery(mockRoutes, 'y', { limit: 1 })
    expect(results.length).toBe(1)
  })

  it('空查询应返回空数组', () => {
    const results = filterRoutesByQuery(mockRoutes, '')
    expect(results).toHaveLength(0)
  })

  it('拼音搜索应匹配对应线路', () => {
    const results = filterRoutesByQuery(mockRoutes, 'bjc')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].name).toBe('八井村')
  })

  it('完全匹配应排在连续匹配之前', () => {
    const results = filterRoutesByQuery(mockRoutes, '圆满')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].name).toBe('圆满')
  })

  it('不匹配的查询应返回空结果', () => {
    const results = filterRoutesByQuery(mockRoutes, 'xyz不存在')
    expect(results).toHaveLength(0)
  })

  it('limit 为 0 时不限制数量', () => {
    const results = filterRoutesByQuery(mockRoutes, 'y', { limit: 0 })
    // 'y' 通过拼音可以匹配多个中文名
    expect(results.length).toBeGreaterThanOrEqual(1)
  })
})
