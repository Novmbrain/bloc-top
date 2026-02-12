'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CragCard } from '@/components/crag-card'
import { FloatingSearch } from '@/components/floating-search'
import { SearchDrawer } from '@/components/search-drawer'
import { AppTabbar } from '@/components/app-tabbar'
import { InstallPrompt } from '@/components/install-prompt'
import { CitySelector } from '@/components/city-selector'
import { EmptyCity } from '@/components/empty-city'
import { useRouteSearch } from '@/hooks/use-route-search'
import { useCitySelection } from '@/hooks/use-city-selection'
import { useWeather } from '@/hooks/use-weather'
import type { Crag, Route, CityConfig, PrefectureConfig } from '@/types'

const EMPTY_ROUTES: Route[] = []

interface HomePageClientProps {
  crags: Crag[]
  allRoutes: Route[]
  serverCityId: string
  cities: CityConfig[]
  prefectures: PrefectureConfig[]
}

export default function HomePageClient({
  crags,
  allRoutes,
  serverCityId,
  cities,
  prefectures,
}: HomePageClientProps) {
  const t = useTranslations('HomePage')
  const tSearch = useTranslations('Search')
  const router = useRouter()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // 城市选择
  const {
    cityId,
    city,
    setCity,
    isLoading,
    isFirstVisit,
    dismissFirstVisitHint,
  } = useCitySelection({ cities })

  // 城市切换后刷新服务端数据
  const handleCityChange = (id: string) => {
    setCity(id)
    // cookie 已在 setCity 中同步，触发服务端重新渲染
    router.refresh()
  }

  // 首次 hydration 后，如果客户端城市与服务端不一致，自动刷新
  const hasCheckedRef = useRef(false)
  useEffect(() => {
    if (!isLoading && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      if (cityId !== serverCityId) {
        router.refresh()
      }
    }
  }, [isLoading, cityId, serverCityId, router])

  // 获取天气数据 (用于卡片角标，不需要预报，使用城市 adcode)
  const { weather } = useWeather({ adcode: city?.adcode, forecast: false })

  // 预计算按 cragId 分组的线路 Map，避免渲染时重复 filter
  const routesByCrag = useMemo(() => {
    const map = new Map<string, Route[]>()
    allRoutes.forEach(r => {
      const arr = map.get(r.cragId) || []
      arr.push(r)
      map.set(r.cragId, arr)
    })
    return map
  }, [allRoutes])

  // 不限制搜索结果数量，由 SearchDrawer 内部控制显示
  const { searchQuery, setSearchQuery, searchResults, clearSearch } =
    useRouteSearch(allRoutes, { limit: 0 })

  const handleCloseSearch = () => {
    setIsSearchOpen(false)
    setTimeout(() => clearSearch(), 300)
  }

  return (
    <div
      className="flex flex-col h-dvh overflow-hidden px-4"
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
              prefectures={prefectures}
              onCityChange={handleCityChange}
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
        {/* PWA 安装提示 - 仅在有岩场数据时显示 */}
        {crags.length > 0 && <InstallPrompt />}

        {/* 根据城市数据可用性显示内容 */}
        {city.available && crags.length > 0 ? (
          <>
            <div className="space-y-3">
              {crags.map((crag, index) => (
                <CragCard
                  key={crag.id}
                  crag={crag}
                  routes={routesByCrag.get(crag.id) || EMPTY_ROUTES}
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

      {/* 浮动搜索框 - 仅在有岩场数据时显示 */}
      {crags.length > 0 && (
        <FloatingSearch onClick={() => setIsSearchOpen(true)} placeholder={tSearch('placeholder')} />
      )}

      {/* 搜索抽屉 */}
      <SearchDrawer
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        results={searchResults}
        crags={crags}
        allRoutes={allRoutes}
        cityId={cityId}
      />

      {/* 底部导航栏 */}
      <AppTabbar />
    </div>
  )
}
