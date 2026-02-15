'use client'

import { useState, useEffect, useMemo } from 'react'
import { Mountain, Plus, MapPin, Loader2, Shield, Settings } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { AppTabbar } from '@/components/app-tabbar'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import { findCityName } from '@/lib/city-utils'
import type { Crag, CityConfig } from '@/types'

type CragWithPermission = Crag & { permissionRole: 'manager' | 'admin' }

const ROLE_CONFIG = {
  admin: { label: '系统管理', icon: Settings, color: 'var(--theme-error)' },
  manager: { label: '管理员', icon: Shield, color: 'var(--theme-primary)' },
} as const

/**
 * 岩场管理列表页
 * 展示当前用户有权限的岩场，显示权限角色
 */
export default function CragListPage() {
  useBreakAppShellLimit()

  const [crags, setCrags] = useState<CragWithPermission[]>([])
  const [cities, setCities] = useState<CityConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCity, setActiveCity] = useState<string>('all')
  const [canCreate, setCanCreate] = useState(false)

  // 加载权限过滤的岩场列表 + 城市数据
  useEffect(() => {
    const controller = new AbortController()
    async function fetchData() {
      try {
        const [cragsRes, citiesRes] = await Promise.all([
          fetch('/api/editor/crags', { signal: controller.signal }),
          fetch('/api/cities', { signal: controller.signal }),
        ])
        const [cragsData, citiesData] = await Promise.all([
          cragsRes.json(),
          citiesRes.json(),
        ])
        if (cragsData.crags) {
          setCrags(cragsData.crags)
          setCanCreate(cragsData.canCreate ?? false)
        }
        if (citiesData.success) {
          setCities(citiesData.cities)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    fetchData()
    return () => controller.abort()
  }, [])

  // 有数据的城市列表
  const cityTabs = useMemo(() => {
    const cityIds = new Set(crags.map((c) => c.cityId))
    return cities.filter((city) => cityIds.has(city.id))
  }, [crags, cities])

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
        {/* 新建岩场按钮 — 仅 admin 可见 */}
        {canCreate && (
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
        )}

        {/* 城市筛选 */}
        {cityTabs.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveCity('all')}
              className={`shrink-0 px-4 py-2 text-sm font-medium transition-all duration-200 ${activeCity === 'all' ? '' : 'glass-light'}`}
              style={{
                backgroundColor: activeCity === 'all'
                  ? 'var(--theme-primary)'
                  : undefined,
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
                className={`shrink-0 px-4 py-2 text-sm font-medium transition-all duration-200 ${activeCity === city.id ? '' : 'glass-light'}`}
                style={{
                  backgroundColor: activeCity === city.id
                    ? 'var(--theme-primary)'
                    : undefined,
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
            暂无可管理的岩场
          </div>
        )}

        {/* 岩场列表 */}
        {!loading && filteredCrags.length > 0 && (
          <div className="flex flex-col gap-3">
            {filteredCrags.map((crag, i) => {
              const roleConfig = ROLE_CONFIG[crag.permissionRole]
              const RoleIcon = roleConfig.icon

              return (
                <Link
                  key={crag.id}
                  href={`/editor/crags/${crag.id}`}
                  className="glass group block p-5 transition-all duration-300 active:scale-[0.98] hover:scale-[1.02] animate-fade-in-up"
                  style={{
                    borderRadius: 'var(--theme-radius-xl)',
                    animationDelay: `${i * 50}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
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
                        {findCityName(cities, crag.cityId)}
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
                    </div>

                    {/* 权限角色标签 */}
                    <span
                      className="inline-flex items-center gap-1 shrink-0 px-2.5 py-1 text-xs font-medium"
                      style={{
                        color: roleConfig.color,
                        backgroundColor: `color-mix(in srgb, ${roleConfig.color} 12%, transparent)`,
                        borderRadius: 'var(--theme-radius-full)',
                      }}
                    >
                      <RoleIcon className="w-3 h-3" />
                      {roleConfig.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="lg:hidden">
        <AppTabbar />
      </div>
    </div>
  )
}
