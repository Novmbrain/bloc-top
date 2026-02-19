'use client'

import { ToggleLeft, ToggleRight } from 'lucide-react'
import type { CityConfig } from '@bloctop/shared/types'

export function CityCard({
  city,
  onToggle,
  onEdit,
}: {
  city: CityConfig
  onToggle: () => void
  onEdit: () => void
}) {
  return (
    <div
      className="glass-light p-4 mb-2 flex items-center justify-between"
      style={{ borderRadius: 'var(--theme-radius-lg)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-medium"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {city.name}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {city.id}
          </span>
        </div>
        <p
          className="text-xs mt-0.5"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          adcode: {city.adcode} · ({city.coordinates.lng}, {city.coordinates.lat})
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggle}
          className="transition-colors"
          style={{ color: city.available ? 'var(--theme-success)' : 'var(--theme-on-surface-variant)' }}
        >
          {city.available ? (
            <ToggleRight className="w-6 h-6" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
        </button>
        <button
          onClick={onEdit}
          className="text-xs font-medium"
          style={{ color: 'var(--theme-primary)' }}
        >
          编辑
        </button>
      </div>
    </div>
  )
}
