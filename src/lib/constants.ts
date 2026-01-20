/**
 * Cloudflare R2 图片存储配置
 */
const IMAGE_BASE_URL = 'https://img.bouldering.top'

/**
 * 生成线路 TOPO 图片 URL
 */
export function getRouteTopoUrl(cragId: string, routeName: string): string {
  return `${IMAGE_BASE_URL}/${cragId}/${encodeURIComponent(routeName)}.jpg`
}

/**
 * 生成岩场封面图片 URL
 */
export function getCragCoverUrl(cragId: string, index: number): string {
  return `${IMAGE_BASE_URL}/CragSurface/${cragId}/${index}.jpg`
}
