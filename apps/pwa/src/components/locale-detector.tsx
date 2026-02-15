'use client'

import { useLocalePreference } from '@/hooks/use-locale-preference'

/**
 * 语言检测组件
 *
 * 这是一个无 UI 的组件，放在布局中触发首次语言检测逻辑：
 * 1. 检查 localStorage 是否有缓存的语言偏好
 * 2. 如果没有，通过 IP 定位判断用户所在地区
 * 3. 中国用户默认中文，其他地区默认英文
 *
 * 只在首次访问时执行检测，后续使用缓存。
 */
export function LocaleDetector() {
  // 使用 hook 触发检测逻辑
  // hook 内部会自动处理首次检测和重定向
  useLocalePreference()

  // 不渲染任何内容
  return null
}
