import { useState, useMemo, useCallback } from 'react'
import { filterRoutesByQuery } from '@bloctop/shared/route-search'
import type { Route } from '@bloctop/shared/types'

// Re-export pure functions and types from shared package
export { matchRouteByQuery, filterRoutesByQuery } from '@bloctop/shared/route-search'
export type { MatchType, MatchInfo } from '@bloctop/shared/route-search'

// ==================== Hook（首页搜索使用） ====================

interface UseRouteSearchOptions {
  limit?: number // 0 或负数表示不限制
}

/**
 * 线路搜索 Hook
 *
 * 实现五级优先级搜索算法（支持拼音）。
 * 纯函数逻辑位于 @bloctop/shared/route-search，此 Hook 提供 React 状态管理。
 *
 * @example
 * ```tsx
 * const { searchQuery, setSearchQuery, searchResults } = useRouteSearch(routes)
 * ```
 */
export function useRouteSearch(
  routes: Route[],
  options: UseRouteSearchOptions = {}
) {
  const { limit = 5 } = options
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * 搜索结果（五级优先级排序）
   * 复用 filterRoutesByQuery 核心函数
   */
  const searchResults = useMemo((): Route[] => {
    return filterRoutesByQuery(routes, searchQuery, { limit })
  }, [routes, searchQuery, limit])

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
