'use client'

import type { PrefectureConfig } from '@bloctop/shared/types'

export function PrefectureCard({
  prefecture,
  onEdit,
}: {
  prefecture: PrefectureConfig
  onEdit: () => void
}) {
  return (
    <div
      className="glass-light p-4 mb-3"
      style={{ borderRadius: 'var(--theme-radius-xl)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <span
            className="font-semibold"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {prefecture.name}
          </span>
          <span
            className="text-xs ml-2"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            ({prefecture.id})
          </span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-medium"
          style={{ color: 'var(--theme-primary)' }}
        >
          编辑
        </button>
      </div>

      <p
        className="text-xs"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        下辖: {prefecture.districts.join(', ')} · 默认: {prefecture.defaultDistrict}
      </p>
    </div>
  )
}
