import type { BetaPlatform } from '@/types'

/**
 * Beta 视频平台配置（目前仅支持小红书）
 */
export const BETA_PLATFORMS: Record<
  BetaPlatform,
  {
    name: string
    color: string
    iconName: string
  }
> = {
  xiaohongshu: {
    name: '小红书',
    color: '#FF2442',
    iconName: 'BookHeart',
  },
}

/**
 * 验证 URL 是否为小红书链接
 */
export function isXiaohongshuUrl(url: string): boolean {
  const urlLower = url.toLowerCase()
  return urlLower.includes('xiaohongshu.com') || urlLower.includes('xhslink.com')
}

/**
 * 根据 URL 检测平台（目前仅支持小红书）
 * @returns 如果是小红书链接返回 'xiaohongshu'，否则返回 null
 */
export function detectPlatformFromUrl(url: string): BetaPlatform | null {
  if (isXiaohongshuUrl(url)) {
    return 'xiaohongshu'
  }
  return null
}
