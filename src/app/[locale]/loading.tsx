'use client'

import { useDelayedLoading } from '@/hooks/use-delayed-loading'

/**
 * 全局加载状态骨架屏
 * 作为 Next.js App Router 的默认 loading 状态
 * 使用与主题一致的骨架屏样式
 *
 * 使用 useDelayedLoading 延迟 100ms 后才显示骨架屏
 * 避免快速加载时的闪烁
 */
export default function Loading() {
  // 延迟 100ms 后才显示骨架屏，避免快速加载时的闪烁
  const showSkeleton = useDelayedLoading(true, 100)

  // 100ms 内加载完成则不显示骨架屏
  if (!showSkeleton) return null

  return (
    <div
      className="flex flex-col h-dvh overflow-hidden px-4"
      style={{
        backgroundColor: 'var(--theme-surface)',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 头部骨架 */}
      <header className="pt-12 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            {/* 标题骨架 */}
            <div
              className="h-8 w-24 rounded-lg skeleton-shimmer"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            />
            {/* 下划线骨架 */}
            <div
              className="w-16 h-0.5 mt-2 mb-3"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            />
          </div>
          {/* 右侧操作按钮骨架 */}
          <div
            className="w-10 h-10 rounded-full skeleton-shimmer"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          />
        </div>
      </header>

      {/* 内容区骨架 */}
      <main className="flex-1 overflow-hidden pb-24">
        <div className="space-y-3">
          {/* 模拟 3 个内容卡片 */}
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="relative overflow-hidden animate-fade-in-up"
              style={{
                height: '120px',
                borderRadius: 'var(--theme-radius-xl)',
                backgroundColor: 'var(--theme-surface-variant)',
                animationDelay: `${index * 80}ms`,
              }}
            >
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
