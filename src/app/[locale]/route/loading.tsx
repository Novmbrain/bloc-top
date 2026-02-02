'use client'

import { RouteCardSkeleton } from '@/components/route-card-skeleton'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'

/**
 * 线路列表页面的加载骨架屏
 * 仅在页面首次加载或硬刷新时显示
 * URL 参数变化（筛选/排序）不会触发此 loading 状态
 *
 * 使用 useDelayedLoading 延迟 100ms 后才显示骨架屏
 * 避免快速加载时的闪烁
 */
export default function RouteListLoading() {
  // 延迟 100ms 后才显示骨架屏，避免快速加载时的闪烁
  const showSkeleton = useDelayedLoading(true, 100)

  // 100ms 内加载完成则不显示骨架屏
  if (!showSkeleton) return null

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      <header className="flex-shrink-0 pt-6 px-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-7 w-24 rounded-md skeleton-shimmer"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          />
          <div className="flex-1" />
          <div
            className="w-10 h-10 rounded-full skeleton-shimmer"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          />
        </div>
        {/* 搜索框骨架 */}
        <div
          className="h-10 w-full rounded-full skeleton-shimmer mb-3"
          style={{ backgroundColor: 'var(--theme-surface-variant)' }}
        />
        {/* 岩场筛选芯片骨架 */}
        <div className="flex gap-2 mb-2">
          {[14, 16, 16].map((w, i) => (
            <div
              key={i}
              className="h-8 rounded-full skeleton-shimmer"
              style={{
                width: `${w * 4}px`,
                backgroundColor: 'var(--theme-surface-variant)',
              }}
            />
          ))}
        </div>
        {/* 难度选择器骨架 */}
        <div className="mt-3">
          <div className="flex justify-between mb-2">
            <div
              className="h-5 w-16 rounded skeleton-shimmer"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            />
          </div>
          <div
            className="h-8 w-full rounded-lg skeleton-shimmer"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex justify-between mb-2">
          <div
            className="h-4 w-20 rounded skeleton-shimmer"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          />
          <div
            className="h-6 w-20 rounded-full skeleton-shimmer"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          />
        </div>
        <RouteCardSkeleton count={6} />
      </main>
    </div>
  )
}
