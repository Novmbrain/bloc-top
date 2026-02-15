import type { Route } from '@/types'

/**
 * 获取与指定线路共享同一岩面的兄弟线路（含自身）。
 * 优先按 faceId 匹配，回退到 cragId + area 匹配。
 * 仅返回拥有有效 topoLine（≥2 个点）的线路。
 */
export function getSiblingRoutes(route: Route | null, allRoutes: Route[]): Route[] {
  if (!route) return []

  if (route.faceId) {
    return allRoutes.filter(
      (r) => r.cragId === route.cragId && r.faceId === route.faceId && r.topoLine && r.topoLine.length >= 2
    )
  }

  return allRoutes.filter(
    (r) =>
      r.cragId === route.cragId &&
      r.area === route.area &&
      r.topoLine &&
      r.topoLine.length >= 2
  )
}
