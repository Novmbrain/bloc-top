import type { Route, RouteTopoAnnotation } from '@bloctop/shared/types'

/**
 * 统一读取线路的 topo 标注列表
 * - 优先使用新字段 topoAnnotations（非空时直接返回）
 * - fallback：旧字段 faceId + topoLine → 合成单条标注
 * - 旧字段 topoLine < 2 点视为无效，返回 []
 */
export function getTopoAnnotations(route: Route): RouteTopoAnnotation[] {
  if (route.topoAnnotations && route.topoAnnotations.length > 0) {
    return route.topoAnnotations
  }
  if (
    route.faceId &&
    route.area &&
    route.topoLine &&
    route.topoLine.length >= 2
  ) {
    return [{
      faceId: route.faceId,
      area: route.area,
      topoLine: route.topoLine,
      topoTension: route.topoTension,
    }]
  }
  return []
}
