'use client'

import { ArrowUpDown } from 'lucide-react'
import type { SortDirection } from '@/lib/filter-constants'

interface CollapsedFilterSummaryProps {
  selectedCragName: string | null
  selectedFaceName: string | null
  gradeRangeLabel: string | null
  sortDirection: SortDirection
  onToggleSort: () => void
  filteredCount: number
  onExpand: () => void
}

/**
 * 折叠态筛选摘要条
 *
 * 当用户滚动线路列表时，RouteFilterBar 折叠，
 * 此组件以一行 glass-md 摘要替代，显示当前活跃筛选状态。
 * 点击芯片区域 → onExpand 滚回顶部恢复展开态。
 */
export function CollapsedFilterSummary({
  selectedCragName,
  selectedFaceName,
  gradeRangeLabel,
  sortDirection,
  onToggleSort,
  filteredCount,
  onExpand,
}: CollapsedFilterSummaryProps) {
  const hasAnyFilter = selectedCragName || selectedFaceName || gradeRangeLabel

  return (
    <div
      className="flex items-center gap-2 glass-md px-4"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(2.75rem + env(safe-area-inset-top, 0px))',
      }}
    >
      {/* 筛选信息 chips — 点击展开 */}
      <button
        onClick={onExpand}
        className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-hide"
      >
        {hasAnyFilter ? (
          <>
            {selectedCragName && (
              <span
                className="px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                {selectedCragName}
              </span>
            )}
            {selectedFaceName && (
              <span
                className="px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0 truncate max-w-20"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
                  color: 'var(--theme-primary)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                {selectedFaceName}
              </span>
            )}
            {gradeRangeLabel && (
              <span
                className="px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
                  color: 'var(--theme-primary)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                {gradeRangeLabel}
              </span>
            )}
          </>
        ) : (
          <span
            className="text-xs"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {filteredCount} 条线路
          </span>
        )}
      </button>

      {/* 排序按钮 — 直接操作，不展开 */}
      <button
        onClick={onToggleSort}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors active:scale-90"
        style={{ color: 'var(--theme-on-surface-variant)' }}
        aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
      </button>

      {/* 线路数量 */}
      <span
        className="flex-shrink-0 text-xs tabular-nums"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        {filteredCount}
      </span>
    </div>
  )
}
