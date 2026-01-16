/**
 * 腾讯云 COS 图片存储配置
 */
export const COS_BASE_URL = 'https://topo-image-1305178596.cos.ap-guangzhou.myqcloud.com'

/**
 * 生成线路 TOPO 图片 URL
 */
export function getRouteTopoUrl(cragId: string, routeName: string): string {
  return `${COS_BASE_URL}/${cragId}/${encodeURIComponent(routeName)}.jpg`
}

/**
 * 生成岩场封面图片 URL
 */
export function getCragCoverUrl(cragId: string, index: number): string {
  return `${COS_BASE_URL}/CragSurface/${cragId}/${index}.jpg`
}
