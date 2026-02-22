'use client'

import { memo } from 'react'
import { ChevronRight, User, Video } from 'lucide-react'
import { getGradeColor } from '@/lib/tokens'
import type { Route } from '@/types'

interface RouteListItemProps {
  route: Route
  onClick: (route: Route) => void
  /** 紧凑模式用于搜索结果等空间受限场景 */
  compact?: boolean
  /** 额外的 className（动画等） */
  className?: string
  /** 额外的 style（动画延迟等） */
  style?: React.CSSProperties
}

/**
 * 线路列表项 — 难度标签 + 名称 + 区域/FA + 箭头
 *
 * 在 route-client 和 search-drawer 中共享使用。
 * React.memo 避免列表筛选时无变化的项重渲染。
 */
export const RouteListItem = memo(function RouteListItem({
  route,
  onClick,
  compact = false,
  className = '',
  style,
}: RouteListItemProps) {
  const badgeSize = compact ? 'w-10 h-10' : 'w-12 h-12'
  const gradeTextSize = compact ? 'text-xs' : 'text-sm'
  const nameTextSize = compact ? 'text-sm' : 'text-base'
  const chevronSize = compact ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <button
      onClick={() => onClick(route)}
      className={`w-full flex items-center p-3 transition-all active:scale-[0.98] text-left ${className}`}
      style={{
        borderRadius: 'var(--theme-radius-xl)',
        ...style,
      }}
    >
      {/* 难度标签 */}
      <div
        className={`${badgeSize} flex items-center justify-center mr-3 flex-shrink-0`}
        style={{
          backgroundColor: getGradeColor(route.grade),
          borderRadius: 'var(--theme-radius-lg)',
        }}
      >
        <span className={`${gradeTextSize} font-bold text-white`}>
          {route.grade}
        </span>
      </div>

      {/* 线路信息 */}
      <div className="flex-1 min-w-0">
        <span
          className={`${nameTextSize} font-semibold block truncate`}
          style={{ color: 'var(--theme-on-surface)' }}
        >
          {route.name}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-xs"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {route.area}
          </span>
          {route.FA && (
            <span
              className="inline-flex items-center gap-0.5 text-xs"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              <User className="w-3 h-3" />
              <span className={compact ? 'truncate max-w-[80px]' : undefined}>{route.FA}</span>
            </span>
          )}
          {compact && route.betaLinks && route.betaLinks.length > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
                color: 'var(--theme-primary)',
              }}
            >
              <Video className="w-3 h-3" />
              Beta
            </span>
          )}
        </div>
      </div>

      {/* 箭头 */}
      <ChevronRight
        className={`${chevronSize} flex-shrink-0`}
        style={{ color: 'var(--theme-on-surface-variant)' }}
      />
    </button>
  )
})
