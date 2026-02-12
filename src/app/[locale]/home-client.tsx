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
import { findCityName } from '@/lib/city-utils'
import { useRouteSearch } from '@/hooks/use-route-search'
import { useCitySelection } from '@/hooks/use-city-selection'
import { useWeather } from '@/hooks/use-weather'
import type { Crag, Route, CityConfig, PrefectureConfig, CitySelection } from '@/types'

const EMPTY_ROUTES: Route[] = []

interface HomePageClientProps {
  crags: Crag[]
  allRoutes: Route[]
  serverSelection: CitySelection
  cities: CityConfig[]
  prefectures: PrefectureConfig[]
}

export default function HomePageClient({
  crags,
  allRoutes,
  serverSelection,
  cities,
  prefectures,
}: HomePageClientProps) {
  const t = useTranslations('HomePage')
  const tSearch = useTranslations('Search')
  const router = useRouter()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // 城市选择
  const {
    selection,
    cityId,
    city,
    setSelection,
    isLoading,
    isFirstVisit,
    dismissFirstVisitHint,
  } = useCitySelection({ cities, prefectures })

  // 选择切换后刷新服务端数据
  const handleSelectionChange = (sel: CitySelection) => {
    setSelection(sel)
    router.refresh()
  }

  // 首次 hydration 后，如果客户端选择与服务端不一致，自动刷新
  const hasCheckedRef = useRef(false)
  useEffect(() => {
    if (!isLoading && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      if (
        selection.type !== serverSelection.type ||
        selection.id !== serverSelection.id
      ) {
        router.refresh()
      }
    }
  }, [isLoading, selection, serverSelection, router])

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

  // 地级市模式：按区/县分组展示
  const cragGroups = useMemo(() => {
    if (selection.type !== 'prefecture') return null
    const pref = prefectures.find((p) => p.id === selection.id)
    if (!pref) return null

    const groups: { districtId: string; districtName: string; crags: Crag[] }[] = []
    for (const districtId of pref.districts) {
      const districtCrags = crags.filter((c) => c.cityId === districtId)
      if (districtCrags.length === 0) continue
      groups.push({
        districtId,
        districtName: findCityName(cities, districtId),
        crags: districtCrags,
      })
    }
    return groups
  }, [selection, prefectures, crags, cities])

  // 不限制搜索结果数量，由 SearchDrawer 内部控制显示
  const { searchQuery, setSearchQuery, searchResults, clearSearch } =
    useRouteSearch(allRoutes, { limit: 0 })

  const handleCloseSearch = () => {
    setIsSearchOpen(false)
    setTimeout(() => clearSearch(), 300)
  }

  // 渲染岩场卡片列表（复用于两种模式）
  const renderCragCards = (cragList: Crag[], startIndex = 0) =>
    cragList.map((crag, i) => (
      <CragCard
        key={crag.id}
        crag={crag}
        routes={routesByCrag.get(crag.id) || EMPTY_ROUTES}
        index={startIndex + i}
        weather={weather}
      />
    ))

  // 判断是否有可用数据（地级市模式用 cragGroups，城市模式用 city.available）
  const hasData = selection.type === 'prefecture'
    ? crags.length > 0
    : city.available && crags.length > 0

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
              currentSelection={selection}
              cities={cities}
              prefectures={prefectures}
              onSelectionChange={handleSelectionChange}
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

        {/* 根据数据可用性显示内容 */}
        {hasData ? (
          <>
            {/* 地级市模式：按区/县分组 */}
            {cragGroups ? (
              <div className="space-y-3">
                {cragGroups.map((group, groupIdx) => {
                  const startIdx = cragGroups
                    .slice(0, groupIdx)
                    .reduce((sum, g) => sum + g.crags.length, 0)
                  return (
                    <div key={group.districtId}>
                      {/* 分组标题 - 仅在多个分组时显示 */}
                      {cragGroups.length > 1 && (
                        <h2
                          className="text-sm font-semibold mt-4 mb-2 first:mt-0"
                          style={{ color: 'var(--theme-on-surface-variant)' }}
                        >
                          {group.districtName}
                        </h2>
                      )}
                      <div className="space-y-3">
                        {renderCragCards(group.crags, startIdx)}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* 城市模式：平铺 */
              <div className="space-y-3">
                {renderCragCards(crags)}
              </div>
            )}

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
