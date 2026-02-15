'use client'

interface CragCardSkeletonProps {
  count?: number
}

/**
 * 岩场卡片骨架屏
 * 匹配 CragCard 的大卡片样式（带封面图区域）
 */
export function CragCardSkeleton({ count = 2 }: CragCardSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="relative overflow-hidden animate-fade-in-up"
          style={{
            height: '176px', // h-44 = 11rem = 176px
            borderRadius: 'var(--theme-radius-xl)',
            backgroundColor: 'var(--theme-surface-variant)',
            animationDelay: `${index * 80}ms`,
          }}
        >
          {/* 闪烁动画叠加层 */}
          <div className="absolute inset-0 skeleton-shimmer" />

          {/* 底部渐变遮罩（模拟真实卡片） */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
            }}
          />

          {/* 内容占位 */}
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            {/* 岩场名称骨架 */}
            <div
              className="h-7 w-28 rounded-md mb-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            />

            {/* 信息行骨架 */}
            <div className="flex items-center gap-3">
              {/* 线路数量标签 */}
              <div
                className="h-6 w-20 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              />
              {/* 难度范围标签 */}
              <div
                className="h-6 w-16 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              />
            </div>

            {/* 位置信息骨架 */}
            <div
              className="h-4 w-36 rounded-full mt-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
