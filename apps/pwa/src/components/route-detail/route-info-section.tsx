'use client'

import { useTranslations } from 'next-intl'
import { MapPin, User, Wrench } from 'lucide-react'
import { getGradeColor } from '@/lib/tokens'
import { vToFont } from '@/lib/grade-utils'
import type { Route, Crag } from '@/types'

interface RouteInfoSectionProps {
  route: Route
  crag?: Crag | null
}

export function RouteInfoSection({ route, crag }: RouteInfoSectionProps) {
  const t = useTranslations('RouteDetail')

  return (
    <>
      {/* Route name + grade */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span
            className="px-2.5 py-1 text-sm font-bold text-white shrink-0"
            style={{
              backgroundColor: getGradeColor(route.grade),
              borderRadius: 'var(--theme-radius-full)',
            }}
          >
            {route.grade}
          </span>
          {vToFont(route.grade) && (
            <span
              className="text-sm shrink-0"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {vToFont(route.grade)}
            </span>
          )}
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {route.name}
          </h2>
        </div>

        {/* Location */}
        <div className="flex items-center gap-4 flex-wrap">
          {crag && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" style={{ color: 'var(--theme-on-surface-variant)' }} />
              <span className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
                {crag.name} · {route.area}
              </span>
            </div>
          )}
          {!crag && route.area && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" style={{ color: 'var(--theme-on-surface-variant)' }} />
              <span className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
                {route.area}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FA and setter */}
      {(route.FA || route.setter) && (
        <div
          className="flex flex-wrap gap-4 p-3 mb-4 glass-light"
          style={{ borderRadius: 'var(--theme-radius-lg)' }}
        >
          {route.FA && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <div>
                <span className="text-xs block" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {t('faLabel')}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>
                  {route.FA}
                </span>
              </div>
            </div>
          )}
          {route.setter && (
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <div>
                <span className="text-xs block" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {t('setter')}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>
                  {route.setter}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {route.description && (
        <div className="mb-4">
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {t('descriptionLabel')}
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {route.description}
          </p>
        </div>
      )}
    </>
  )
}
