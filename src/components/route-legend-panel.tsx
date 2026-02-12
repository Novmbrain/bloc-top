'use client'

import { useTranslations } from 'next-intl'
import type { MultiTopoRoute } from '@/components/multi-topo-line-overlay'
import { getGradeColor } from '@/lib/tokens'

/** 智能默认阈值：超过此数量的线路默认不叠加显示 */
const SMART_DEFAULT_THRESHOLD = 3

interface RouteLegendPanelProps {
  /** 同岩面所有有效线路 */
  routes: MultiTopoRoute[]
  /** 当前焦点线路 ID */
  selectedRouteId: number
  /** 线路切换回调 */
  onRouteSelect: (routeId: number) => void
  /** 是否显示所有叠加线路（用于 >3 条时的 toggle） */
  showAllOverlay: boolean
  /** 切换显示所有叠加线路 */
  onToggleShowAll: () => void
}

export function RouteLegendPanel({
  routes,
  selectedRouteId,
  onRouteSelect,
  showAllOverlay,
  onToggleShowAll,
}: RouteLegendPanelProps) {
  const t = useTranslations('RouteDetail')
  const showToggle = routes.length > SMART_DEFAULT_THRESHOLD

  return (
    <div
      className="mb-3 overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-surface-variant)',
        borderRadius: 'var(--theme-radius-lg)',
      }}
    >
      <div className="max-h-[200px] overflow-y-auto">
        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId
          const color = getGradeColor(route.grade)

          return (
            <button
              key={route.id}
              className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: isSelected
                  ? 'color-mix(in srgb, var(--theme-primary) 8%, transparent)'
                  : undefined,
              }}
              onClick={() => {
                if (!isSelected) onRouteSelect(route.id)
              }}
            >
              {/* 颜色圆点 */}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isSelected ? color : 'transparent',
                  border: isSelected ? 'none' : `2px solid ${color}`,
                  opacity: isSelected ? 1 : 0.6,
                }}
              />

              {/* 难度 badge */}
              <span
                className="text-xs shrink-0"
                style={{
                  color,
                  fontWeight: isSelected ? 700 : 500,
                  opacity: isSelected ? 1 : 0.6,
                }}
              >
                {route.grade}
              </span>

              {/* 线路名 */}
              <span
                className="text-sm truncate"
                style={{
                  color: isSelected
                    ? 'var(--theme-on-surface)'
                    : 'var(--theme-on-surface-variant)',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {route.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Toggle: 显示全部 / 仅看当前 (>3 条时) */}
      {showToggle && (
        <button
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors duration-200"
          style={{
            borderTop: '1px solid var(--theme-outline-variant)',
            color: 'var(--theme-primary)',
          }}
          onClick={onToggleShowAll}
        >
          {showAllOverlay ? t('showCurrentOnly') : t('showAllRoutes')}
        </button>
      )}
    </div>
  )
}
