import type { Route, Crag } from '@/types'

/**
 * 从线路列表和岩场配置中派生当前岩场的区域列表
 * 仅保留属于 selectedCragId 的线路区域，防止切换岩场时残留旧数据
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
