import { useState, useMemo, useCallback } from 'react'
import { match as pinyinMatch } from 'pinyin-pro'
import type { Route } from '@/types'

/**
 * 匹配类型优先级：
 * 1 = 中文完全匹配 (最高)
 * 2 = 中文连续匹配
 * 3 = 拼音全拼匹配
 * 4 = 拼音首字母/混合匹配
 * 5 = 中文非连续匹配 (最低)
 */
export type MatchType = 1 | 2 | 3 | 4 | 5

export interface MatchInfo {
  type: MatchType
  position: number
  matchedIndices?: number[] // 拼音匹配时返回的索引
}

interface MatchedRoute extends Route {
  matchInfo: MatchInfo
}

interface UseRouteSearchOptions {
  limit?: number // 0 或负数表示不限制
}

// ==================== 核心匹配函数（可独立使用） ====================

/**
 * 检测字符串是否包含中文
 */
function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str)
}

/**
 * 检测字符串是否为纯拼音（字母）
 */
function isPureAlpha(str: string): boolean {
  return /^[a-zA-Z]+$/.test(str)
}

/**
 * 判断拼音匹配是否为全拼匹配
 * 全拼：匹配索引连续且等于文本长度
 */
function isFullPinyinMatch(text: string, matchedIndices: number[]): boolean {
  if (matchedIndices.length !== text.length) return false
  for (let i = 0; i < matchedIndices.length; i++) {
    if (matchedIndices[i] !== i) return false
  }
  return true
}

/**
 * 查找中文非连续匹配
 */
function findDiscontinuousMatch(
  name: string,
  query: string
): { firstPosition: number } | null {
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
}

/**
 * 获取匹配信息（支持中文和拼音）
 * @param name - 线路名称（小写）
 * @param originalName - 线路名称（原始大小写，用于拼音匹配）
 * @param query - 搜索词（小写）
 * @returns 匹配信息，null 表示不匹配
 */
function getMatchInfo(
  name: string,
  originalName: string,
  query: string
): MatchInfo | null {
  // === 中文匹配（查询包含中文时优先） ===

  // 类型1: 中文完全匹配
  if (name === query) {
    return { type: 1, position: 0 }
  }

  // 类型2: 中文连续匹配
  const continuousIndex = name.indexOf(query)
  if (continuousIndex !== -1) {
    return { type: 2, position: continuousIndex }
  }

  // === 拼音匹配（查询为纯字母时） ===
  if (isPureAlpha(query) && containsChinese(originalName)) {
    const matchedIndices = pinyinMatch(originalName, query)

    if (matchedIndices && matchedIndices.length > 0) {
      const firstPosition = matchedIndices[0]

      // 类型3: 拼音全拼匹配（所有字符都匹配上）
      if (isFullPinyinMatch(originalName, matchedIndices)) {
        return { type: 3, position: firstPosition, matchedIndices }
      }

      // 类型4: 拼音部分匹配（首字母或混合）
      return { type: 4, position: firstPosition, matchedIndices }
    }
  }

  // === 降级匹配 ===

  // 类型5: 中文非连续匹配（仅对中文查询）
  if (containsChinese(query)) {
    const discontinuousMatch = findDiscontinuousMatch(name, query)
    if (discontinuousMatch) {
      return { type: 5, position: discontinuousMatch.firstPosition }
    }
  }

  return null
}

/**
 * 判断线路是否匹配搜索词（支持拼音）
 *
 * 这是核心匹配函数，可在任何地方独立使用。
 * 支持：中文完全/连续/非连续匹配、拼音全拼/首字母/混合匹配
 *
 * @param route - 线路对象
 * @param query - 搜索词（会自动 trim 和 toLowerCase）
 * @returns 匹配信息（包含类型和位置），null 表示不匹配
 *
 * @example
 * ```ts
 * // 判断是否匹配
 * if (matchRouteByQuery(route, 'ywct')) {
 *   console.log('匹配成功')
 * }
 *
 * // 获取匹配详情
 * const match = matchRouteByQuery(route, '月光')
 * if (match) {
 *   console.log(`匹配类型: ${match.type}, 位置: ${match.position}`)
 * }
 * ```
 */
export function matchRouteByQuery(route: Route, query: string): MatchInfo | null {
  if (!query || !query.trim() || !route.name) {
    return null
  }

  const queryLower = query.trim().toLowerCase()
  const nameLower = route.name.toLowerCase()

  return getMatchInfo(nameLower, route.name, queryLower)
}

/**
 * 过滤并排序线路列表（支持拼音搜索）
 *
 * 这是批量过滤函数，用于过滤线路数组并按匹配优先级排序。
 *
 * @param routes - 线路数组
 * @param query - 搜索词
 * @param options - 选项
 * @returns 匹配的线路数组（已排序）
 *
 * @example
 * ```ts
 * const results = filterRoutesByQuery(routes, 'ywct')
 * ```
 */
export function filterRoutesByQuery(
  routes: Route[],
  query: string,
  options: { limit?: number } = {}
): Route[] {
  const { limit = 0 } = options

  if (!query || !query.trim()) {
    return []
  }

  const matchedRoutes: MatchedRoute[] = []

  routes.forEach((route) => {
    const matchInfo = matchRouteByQuery(route, query)
    if (matchInfo) {
      matchedRoutes.push({ ...route, matchInfo })
    }
  })

  // 按优先级排序
  matchedRoutes.sort((a, b) => {
    // 优先级1: 匹配类型（数字越小优先级越高）
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return results.map(({ matchInfo, ...route }) => route)
}

// ==================== Hook（首页搜索使用） ====================

/**
 * 线路搜索 Hook
 *
 * 实现五级优先级搜索算法（支持拼音）。
 * 内部复用 `filterRoutesByQuery` 函数，保持与独立使用时行为一致。
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
