'use client'
import { useEffect } from 'react'

/**
 * 桌面端突破 app-shell maxWidth 限制
 * 用于 editor 页面需要全宽双栏布局的场景
 */
export function useBreakAppShellLimit() {
  useEffect(() => {
    const shell = document.getElementById('app-shell')
    if (!shell) return
    const original = shell.style.maxWidth
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const update = (mq: MediaQueryList | MediaQueryListEvent) => {
      shell.style.maxWidth = mq.matches ? 'none' : original
    }
    update(mediaQuery)
    mediaQuery.addEventListener('change', update)
    return () => {
      mediaQuery.removeEventListener('change', update)
      shell.style.maxWidth = original
    }
  }, [])
}
