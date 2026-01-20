/**
 * Cloudflare R2 图片存储配置
 */
const IMAGE_BASE_URL = 'https://img.bouldering.top'

/**
 * 图片全局版本号 (Cache Busting)
 *
 * 当批量更新图片后，修改此值即可让所有用户获取新图片
 * 格式建议：YYYYMMDD 或递增数字
 *
 * 示例：
 * - 初始版本：'1'
 * - 2025年1月更新：'20250120'
 * - 下次更新：'20250215'
 */
export const IMAGE_VERSION = '1'

/**
 * 生成线路 TOPO 图片 URL (带版本号)
 */
export function getRouteTopoUrl(cragId: string, routeName: string): string {
  return `${IMAGE_BASE_URL}/${cragId}/${encodeURIComponent(routeName)}.jpg?v=${IMAGE_VERSION}`
}

/**
 * 生成岩场封面图片 URL (带版本号)
 */
export function getCragCoverUrl(cragId: string, index: number): string {
  return `${IMAGE_BASE_URL}/CragSurface/${cragId}/${index}.jpg?v=${IMAGE_VERSION}`
}
