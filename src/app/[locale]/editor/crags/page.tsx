'use client'

import { useState, useEffect, useMemo } from 'react'
import { Mountain, Plus, MapPin, Loader2 } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { AppTabbar } from '@/components/app-tabbar'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import { CITIES, getCityName } from '@/lib/city-config'
import type { Crag } from '@/types'
import type { CityId } from '@/lib/city-config'

/**
 * 岩场管理列表页
 * 展示所有岩场，支持按城市筛选，入口新建/编辑岩场
 */
export default function CragListPage() {
  useBreakAppShellLimit()

  const [crags, setCrags] = useState<Crag[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCity, setActiveCity] = useState<CityId | 'all'>('all')

  // 加载岩场列表
  useEffect(() => {
    async function fetchCrags() {
      try {
        const res = await fetch('/api/crags')
        const data = await res.json()
        if (data.success) {
          setCrags(data.crags)
        }
      } catch {
        // 静默处理
      } finally {
        setLoading(false)
      }
    }
    fetchCrags()
  }, [])

  // 有数据的城市列表
  const cityTabs = useMemo(() => {
    const cityIds = new Set(crags.map((c) => c.cityId))
    return CITIES.filter((city) => cityIds.has(city.id))
  }, [crags])

  // 按城市筛选
  const filteredCrags = useMemo(() => {
    if (activeCity === 'all') return crags
    return crags.filter((c) => c.cityId === activeCity)
  }, [crags, activeCity])

  return (
    <div
      className="min-h-screen pb-20 lg:pb-0"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      <EditorPageHeader
        title="岩场管理"
        icon={<Mountain className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />}
        isDetailMode={false}
        onBackToList={() => {}}
        listLabel="岩场列表"
      />

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 新建岩场按钮 */}
        <Link
          href="/editor/crags/new"
          className="flex items-center justify-center gap-2 w-full py-3 mb-6 font-medium transition-all duration-200 active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          <Plus className="w-5 h-5" />
          新建岩场
        </Link>

        {/* 城市筛选 */}
        {cityTabs.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveCity('all')}
              className="shrink-0 px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: activeCity === 'all'
                  ? 'var(--theme-primary)'
                  : 'var(--theme-surface-variant)',
                color: activeCity === 'all'
                  ? 'var(--theme-on-primary)'
                  : 'var(--theme-on-surface-variant)',
                borderRadius: 'var(--theme-radius-full)',
              }}
            >
              全部
            </button>
            {cityTabs.map((city) => (
              <button
                key={city.id}
                onClick={() => setActiveCity(city.id)}
                className="shrink-0 px-4 py-2 text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeCity === city.id
                    ? 'var(--theme-primary)'
                    : 'var(--theme-surface-variant)',
                  color: activeCity === city.id
                    ? 'var(--theme-on-primary)'
                    : 'var(--theme-on-surface-variant)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                {city.name}
              </button>
            ))}
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: 'var(--theme-primary)' }}
            />
          </div>
        )}

        {/* 空状态 */}
        {!loading && filteredCrags.length === 0 && (
          <div
            className="text-center py-20 text-sm"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            暂无岩场数据
          </div>
        )}

        {/* 岩场列表 */}
        {!loading && filteredCrags.length > 0 && (
          <div className="flex flex-col gap-3">
            {filteredCrags.map((crag, i) => (
              <Link
                key={crag.id}
                href={`/editor/crags/${crag.id}`}
                className="group block p-5 transition-all duration-300 active:scale-[0.98] hover:scale-[1.02] animate-fade-in-up"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-xl)',
                  boxShadow: 'var(--theme-shadow-md)',
                  animationDelay: `${i * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <h3
                  className="text-base font-bold mb-1"
                  style={{ color: 'var(--theme-on-surface)' }}
                >
                  {crag.name}
                </h3>

                <p
                  className="text-xs mb-2"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  {getCityName(crag.cityId as CityId)}
                  {crag.areas && crag.areas.length > 0 && (
                    <span style={{ color: 'var(--theme-on-surface-variant)' }}>
                      {' '}· {crag.areas.length} 个区域
                    </span>
                  )}
                </p>

                <div className="flex items-center gap-1.5">
                  <MapPin
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  />
                  <p
                    className="text-xs truncate"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    {crag.location}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="lg:hidden">
        <AppTabbar />
      </div>
    </div>
  )
}
