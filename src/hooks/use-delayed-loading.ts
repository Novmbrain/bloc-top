import { useState, useEffect, useRef } from 'react'

/**
 * 延迟显示加载状态的 Hook
 * 避免快速加载时的骨架屏闪烁
 *
 * 原理：如果页面在阈值时间内加载完成，用户几乎感知不到延迟
 * 此时不显示骨架屏反而更流畅
 *
 * @param isLoading - 实际加载状态
 * @param delay - 延迟阈值 (默认 100ms)
 * @returns 是否应该显示加载状态
 *
 * @example
 * ```tsx
 * // 在 loading.tsx 中使用
 * const showSkeleton = useDelayedLoading(true, 100)
 * if (!showSkeleton) return null
 * return <Skeleton />
 * ```
 */
export function useDelayedLoading(isLoading: boolean, delay = 100): boolean {
  const [showLoading, setShowLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 清理之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (isLoading) {
      // 设置定时器，延迟后才显示加载状态
      timerRef.current = setTimeout(() => {
        setShowLoading(true)
      }, delay)
    }

    return () => {
      // cleanup: 清理定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isLoading, delay])

  // 当 isLoading 变为 false 时，同步重置状态
  // 这比在 effect 中设置更符合 React 模式
  if (!isLoading && showLoading) {
    // 注意：这会触发一次额外渲染，但这是符合 React 最佳实践的方式
    // 实际上在 loading.tsx 场景中 isLoading 始终为 true，这个分支不会执行
    return false
  }

  return showLoading
}
