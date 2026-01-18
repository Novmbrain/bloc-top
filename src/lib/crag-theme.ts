/**
 * 岩场主题配置
 * 每个岩场拥有独特的渐变色和图标，营造视觉差异化
 */

export interface CragTheme {
  gradient: string           // 背景渐变
  icon: string              // 装饰图标 (emoji 或 lucide icon name)
  accentColor: string       // 强调色
}

// 预设的大地色系渐变主题
const CRAG_THEMES: Record<string, CragTheme> = {
  'yuan-tong-si': {
    gradient: 'linear-gradient(135deg, #8B7355 0%, #A08060 50%, #C4A77D 100%)',
    icon: '🏛️',
    accentColor: '#8B7355',
  },
  'ba-jing-cun': {
    gradient: 'linear-gradient(135deg, #5C7C5C 0%, #6B8E6B 50%, #8FBC8F 100%)',
    icon: '🌲',
    accentColor: '#5C7C5C',
  },
}

// 备用主题池 - 用于没有预设主题的岩场
const FALLBACK_THEMES: CragTheme[] = [
  {
    gradient: 'linear-gradient(135deg, #6B5B4F 0%, #8B7355 50%, #A08060 100%)',
    icon: '🪨',
    accentColor: '#6B5B4F',
  },
  {
    gradient: 'linear-gradient(135deg, #4A5D4A 0%, #5C7C5C 50%, #6B8E6B 100%)',
    icon: '🌿',
    accentColor: '#4A5D4A',
  },
  {
    gradient: 'linear-gradient(135deg, #5D5A6B 0%, #7B7890 50%, #9896A4 100%)',
    icon: '⛰️',
    accentColor: '#5D5A6B',
  },
  {
    gradient: 'linear-gradient(135deg, #6B5A4F 0%, #8B6B55 50%, #A07D60 100%)',
    icon: '🧗',
    accentColor: '#6B5A4F',
  },
  {
    gradient: 'linear-gradient(135deg, #4F5D5A 0%, #5C7370 50%, #6B8985 100%)',
    icon: '🏔️',
    accentColor: '#4F5D5A',
  },
]

/**
 * 根据岩场 ID 获取主题
 * 使用确定性算法确保相同 ID 总是返回相同主题
 */
export function getCragTheme(cragId: string): CragTheme {
  // 优先使用预设主题
  if (CRAG_THEMES[cragId]) {
    return CRAG_THEMES[cragId]
  }

  // 使用 ID 的 hash 值选择备用主题
  const hash = cragId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)

  const index = Math.abs(hash) % FALLBACK_THEMES.length
  return FALLBACK_THEMES[index]
}

