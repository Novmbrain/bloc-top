import { useMemo } from 'react'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import type { Route } from '@/types'
import { getGradeColor } from '@/lib/tokens'

/**
 * 线路卡片组件 - 用于线路列表
 */
export function RouteCard({
  route,
  isSelected,
  onClick,
}: {
  route: Route
  isSelected: boolean
  onClick: () => void
}) {
  const hasTopo = useMemo(
    () => route.topoLine && route.topoLine.length >= 2,
    [route.topoLine]
  )
  const gradeColor = useMemo(
    () => getGradeColor(route.grade),
    [route.grade]
  )

  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full text-left overflow-hidden
        transition-all duration-300 ease-out
        active:scale-[0.98]
        ${isSelected ? 'ring-2 ring-offset-2' : 'glass'}
      `}
      style={{
        backgroundColor: isSelected
          ? 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))'
          : undefined,
        borderRadius: 'var(--theme-radius-xl)',
        // @ts-expect-error -- CSS custom properties for ring
        '--tw-ring-color': gradeColor,
        '--tw-ring-offset-color': 'var(--theme-surface)',
      }}
    >
      {/* 左侧难度色带 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
        style={{
          backgroundColor: gradeColor,
          opacity: isSelected ? 1 : 0.6,
        }}
      />

      <div className="flex items-center gap-3 p-3 pl-4">
        {/* 标注状态图标 */}
        <div
          className={`
            relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
            transition-all duration-300
            ${hasTopo ? 'animate-pulse-subtle' : 'glass-light'}
          `}
          style={{
            backgroundColor: hasTopo
              ? 'color-mix(in srgb, var(--theme-success) 15%, var(--theme-surface))'
              : undefined,
          }}
        >
          {hasTopo ? (
            <CheckCircle2
              className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
              style={{ color: 'var(--theme-success)' }}
            />
          ) : (
            <Circle
              className="w-5 h-5"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            />
          )}
        </div>

        {/* 线路信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold truncate transition-colors duration-200"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              {route.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-xs"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {route.area}
            </span>
            {hasTopo && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-success) 15%, transparent)',
                  color: 'var(--theme-success)',
                }}
              >
                已标注
              </span>
            )}
          </div>
        </div>

        {/* 难度标签 */}
        <div
          className="px-2.5 py-1 rounded-full text-xs font-bold text-white flex-shrink-0
                     transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundColor: gradeColor,
            boxShadow: `0 2px 8px ${gradeColor}40`,
          }}
        >
          {route.grade}
        </div>

        {/* 箭头指示 */}
        <ChevronRight
          className={`
            w-4 h-4 flex-shrink-0 transition-all duration-300
            ${isSelected ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}
          `}
          style={{ color: 'var(--theme-primary)' }}
        />
      </div>
    </button>
  )
}
