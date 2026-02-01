'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { CragCard } from '@/components/crag-card'
import { FloatingSearch } from '@/components/floating-search'
import { SearchDrawer } from '@/components/search-drawer'
import { AppTabbar } from '@/components/app-tabbar'
import { InstallPrompt } from '@/components/install-prompt'
import { WeatherStrip } from '@/components/weather-strip'
import { CitySelector } from '@/components/city-selector'
import { EmptyCity } from '@/components/empty-city'
import { useRouteSearch } from '@/hooks/use-route-search'
import { useCitySelection } from '@/hooks/use-city-selection'
import { useWeather } from '@/hooks/use-weather'
import type { Crag, Route } from '@/types'

interface HomePageClientProps {
  crags: Crag[]
  allRoutes: Route[]
}

export default function HomePageClient({ crags, allRoutes }: HomePageClientProps) {
  const t = useTranslations('HomePage')
  const tSearch = useTranslations('Search')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // 城市选择
  const {
    cityId,
    city,
    cities,
    setCity,
    isFirstVisit,
    dismissFirstVisitHint,
  } = useCitySelection()

  // 根据城市筛选岩场
  const filteredCrags = useMemo(() => {
    // 如果岩场没有 cityId 字段（兼容旧数据），默认归属罗源
    return crags.filter((crag) => (crag.cityId || 'luoyuan') === cityId)
  }, [crags, cityId])

  // 根据城市筛选线路（用于搜索）
  const filteredRoutes = useMemo(() => {
    const cragIds = new Set(filteredCrags.map((c) => c.id))
    return allRoutes.filter((route) => cragIds.has(route.cragId))
  }, [allRoutes, filteredCrags])

  // 获取天气数据 (用于卡片角标，不需要预报)
  const { weather } = useWeather({ forecast: false })

  // 不限制搜索结果数量，由 SearchDrawer 内部控制显示
  const { searchQuery, setSearchQuery, searchResults, clearSearch } =
    useRouteSearch(filteredRoutes, { limit: 0 })

  const handleCloseSearch = () => {
    setIsSearchOpen(false)
    setTimeout(() => clearSearch(), 300)
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden px-4"
      style={{
        backgroundColor: 'var(--theme-surface)',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 头部区域 */}
      <header className="pt-12 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            {/* 城市选择器 */}
            <CitySelector
              currentCity={city}
              cities={cities}
              onCityChange={setCity}
              showHint={isFirstVisit}
              onDismissHint={dismissFirstVisitHint}
            />
            <div
              className="w-16 h-0.5 mt-1 mb-3"
              style={{
                background: `linear-gradient(to right, var(--theme-primary), transparent)`,
              }}
            />
          </div>
        </div>
      </header>

      {/* 岩场列表（可滚动区域） */}
      <main className="flex-1 overflow-y-auto pb-36">
        {/* 天气条 - 仅在有数据时显示 */}
        {city.available && <WeatherStrip />}

        {/* PWA 安装提示 - 仅在有数据时显示 */}
        {city.available && <InstallPrompt />}

        {/* 根据城市数据可用性显示内容 */}
        {city.available ? (
          <>
            <div className="space-y-3">
              {filteredCrags.map((crag, index) => (
                <CragCard
                  key={crag.id}
                  crag={crag}
                  routes={(filteredRoutes || []).filter((r) => r.cragId === crag.id)}
                  index={index}
                  weather={weather}
                />
              ))}
            </div>

            {/* 底部提示 */}
            <div className="text-center py-4">
              <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                {t('moreComingSoon')}
              </span>
            </div>
          </>
        ) : (
          <EmptyCity city={city} />
        )}
      </main>

      {/* 浮动搜索框 - 仅在有数据时显示 */}
      {city.available && (
        <FloatingSearch onClick={() => setIsSearchOpen(true)} placeholder={tSearch('placeholder')} />
      )}

      {/* 搜索抽屉 */}
      <SearchDrawer
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        results={searchResults}
        crags={filteredCrags}
        allRoutes={filteredRoutes}
      />

      {/* 底部导航栏 */}
      <AppTabbar />
    </div>
  )
}
