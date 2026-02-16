'use client'

import { useState } from 'react'
import { Mountain, MapPin, Loader2, ChevronDown } from 'lucide-react'
import type { Crag } from '@bloctop/shared/types'
import { ProgressRing } from './progress-ring'

/**
 * 岩场选择器 + 进度显示
 */
export function CragSelector({
  crags,
  selectedCragId,
  isLoading,
  onSelect,
  stats,
}: {
  crags: Crag[]
  selectedCragId: string | null
  isLoading: boolean
  onSelect: (id: string) => void
  stats: { total: number; marked: number; progress: number }
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const selectedCrag = crags.find((c) => c.id === selectedCragId)

  return (
    <div
      className="glass-light relative z-20 mb-4 p-4 animate-fade-in-up"
      style={{
        borderRadius: 'var(--theme-radius-xl)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <button
            className="glass w-full p-3 rounded-xl flex items-center justify-between gap-2 transition-all duration-200 active:scale-[0.99]"
            style={{
              color: 'var(--theme-on-surface)',
            }}
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <Mountain className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 animate-spin"><Loader2 className="w-full h-full" /></div>
                  加载中...
                </span>
              ) : selectedCrag ? (
                <span className="font-medium">{selectedCrag.name}</span>
              ) : (
                <span style={{ color: 'var(--theme-on-surface-variant)' }}>
                  选择岩场...
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ${
                showDropdown ? 'rotate-180' : ''
              }`}
              style={{ color: 'var(--theme-on-surface-variant)' }}
            />
          </button>

          {showDropdown && (
            <div
              className="glass-heavy absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden animate-scale-in"
              style={{
                borderRadius: 'var(--theme-radius-xl)',
              }}
            >
              {crags.map((crag) => (
                <button
                  key={crag.id}
                  className="w-full p-3 text-left flex items-center gap-3 transition-all duration-200 hover:bg-opacity-50"
                  style={{
                    color: 'var(--theme-on-surface)',
                    backgroundColor:
                      selectedCragId === crag.id
                        ? 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))'
                        : 'transparent',
                  }}
                  onClick={() => {
                    onSelect(crag.id)
                    setShowDropdown(false)
                  }}
                >
                  <MapPin
                    className="w-4 h-4"
                    style={{
                      color:
                        selectedCragId === crag.id
                          ? 'var(--theme-primary)'
                          : 'var(--theme-on-surface-variant)',
                    }}
                  />
                  <span className={selectedCragId === crag.id ? 'font-medium' : ''}>
                    {crag.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {stats.total > 0 && (
          <div className="flex items-center gap-3">
            <ProgressRing progress={stats.progress} size={52} strokeWidth={5} />
            <div className="text-right">
              <div
                className="text-lg font-bold"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                {stats.marked}/{stats.total}
              </div>
              <div
                className="text-xs"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                已标注
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
