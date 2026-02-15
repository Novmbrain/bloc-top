import type { Route, Crag } from '@/types'

/**
 * 从线路列表和岩场配置中派生当前岩场的区域列表（用于 UI 显示）
 * 合并 crag.areas（持久化）和 routes 中的 area（动态派生）
 */
export function deriveAreas(
  routes: Route[],
  selectedCragId: string | null,
  selectedCrag: Crag | undefined,
): string[] {
  if (!selectedCragId) return []
  const routeAreas = routes
    .filter(r => r.cragId === selectedCragId)
    .map(r => r.area)
    .filter(Boolean)
  const cragAreas = selectedCrag?.areas ?? []
  return [...new Set([...cragAreas, ...routeAreas])].sort()
}

/**
 * 获取仅持久化的 crag areas（不含 routes 动态派生的部分）
 * 用于写入 DB 时作为基础，避免将 route 派生 area 意外持久化
 */
export function getPersistedAreas(selectedCrag: Crag | undefined): string[] {
  return selectedCrag?.areas ?? []
}
