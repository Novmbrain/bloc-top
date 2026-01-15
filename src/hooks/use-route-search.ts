import { useState, useMemo, useCallback } from 'react'
import type { Route } from '@/types'

interface MatchInfo {
  type: 1 | 2 | 3 // 1=完全匹配, 2=连续部分匹配, 3=非连续匹配
  position: number
}

interface MatchedRoute extends Route {
  matchInfo: MatchInfo
}

interface UseRouteSearchOptions {
  limit?: number // 0 或负数表示不限制
}

/**
 * 线路搜索 Hook
 * 实现三级优先级搜索算法
 */
export function useRouteSearch(
  routes: Route[],
  options: UseRouteSearchOptions = {}
) {
  const { limit = 5 } = options
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * 查找非连续匹配
   */
  const findDiscontinuousMatch = useCallback(
    (name: string, query: string): { firstPosition: number } | null => {
      let nameIndex = 0
      let queryIndex = 0
      let firstPosition = -1

      while (nameIndex < name.length && queryIndex < query.length) {
        if (name[nameIndex] === query[queryIndex]) {
          if (firstPosition === -1) {
            firstPosition = nameIndex
          }
          queryIndex++
        }
        nameIndex++
      }

      if (queryIndex === query.length) {
        return { firstPosition }
      }

      return null
    },
    []
  )

  /**
   * 获取匹配信息
   */
  const getMatchInfo = useCallback(
    (name: string, query: string): MatchInfo | null => {
      // 类型1: 完全匹配
      if (name === query) {
        return { type: 1, position: 0 }
      }

      // 类型2: 连续部分匹配
      const continuousIndex = name.indexOf(query)
      if (continuousIndex !== -1) {
        return { type: 2, position: continuousIndex }
      }

      // 类型3: 非连续匹配
      const discontinuousMatch = findDiscontinuousMatch(name, query)
      if (discontinuousMatch) {
        return { type: 3, position: discontinuousMatch.firstPosition }
      }

      return null
    },
    [findDiscontinuousMatch]
  )

  /**
   * 搜索结果（三级优先级排序）
   */
  const searchResults = useMemo((): Route[] => {
    if (!searchQuery || searchQuery.trim() === '') {
      return []
    }

    const queryLower = searchQuery.trim().toLowerCase()
    const matchedRoutes: MatchedRoute[] = []

    routes.forEach((route) => {
      if (!route.name) return

      const nameLower = route.name.toLowerCase()
      const matchInfo = getMatchInfo(nameLower, queryLower)

      if (matchInfo) {
        matchedRoutes.push({
          ...route,
          matchInfo,
        })
      }
    })

    // 按优先级排序
    matchedRoutes.sort((a, b) => {
      // 优先级1: 匹配类型（完全 > 连续 > 非连续）
      if (a.matchInfo.type !== b.matchInfo.type) {
        return a.matchInfo.type - b.matchInfo.type
      }
      // 优先级2: 匹配位置（越靠左越优先）
      if (a.matchInfo.position !== b.matchInfo.position) {
        return a.matchInfo.position - b.matchInfo.position
      }
      // 优先级3: 按 ID 排序（保持稳定性）
      return a.id - b.id
    })

    // 根据 limit 参数限制返回数量
    const results = limit > 0 ? matchedRoutes.slice(0, limit) : matchedRoutes

    // 移除 matchInfo 属性，返回纯 Route 数组
    return results.map(({ matchInfo: _matchInfo, ...route }) => route)
  }, [routes, searchQuery, limit, getMatchInfo])

  /**
   * 清除搜索
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    clearSearch,
    hasResults: searchResults.length > 0,
  }
}
