'use client'

import { useMemo, useCallback, useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRight, ArrowUp, ArrowDown, X } from 'lucide-react'
import { getGradeColor } from '@/lib/tokens'
import { FILTER_PARAMS, getGradesByValues, DEFAULT_SORT_DIRECTION, type SortDirection } from '@/lib/filter-constants'
import { compareGrades } from '@/lib/grade-utils'
import { getSiblingRoutes } from '@/lib/route-utils'
import { matchRouteByQuery } from '@/hooks/use-route-search'
import { FilterChip, FilterChipGroup } from '@/components/filter-chip'
import { GradeRangeSelectorVertical } from '@/components/grade-range-selector-vertical'
import { FaceThumbnailStrip } from '@/components/face-thumbnail-strip'
import { FloatingSearchInput } from '@/components/floating-search-input'
import { RouteDetailDrawer } from '@/components/route-detail-drawer'
import { AppTabbar } from '@/components/app-tabbar'
import type { Route, Crag } from '@/types'

interface RouteListClientProps {
  routes: Route[]
  crags: Crag[]
}

export default function RouteListClient({ routes, crags }: RouteListClientProps) {
  const t = useTranslations('RouteList')
  const tCommon = useTranslations('Common')
  const tSearch = useTranslations('Search')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // 抽屉状态
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

  // 入场动画控制
  const [hasInitialRender, setHasInitialRender] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setHasInitialRender(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // 从 URL 读取筛选状态
  const selectedCrag = searchParams.get(FILTER_PARAMS.CRAG) || ''
  const gradeParam = searchParams.get(FILTER_PARAMS.GRADE)
  const selectedGrades = useMemo(
    () => (gradeParam ? gradeParam.split(',') : []),
    [gradeParam]
  )
  const searchQuery = searchParams.get(FILTER_PARAMS.QUERY) || ''
  const sortDirection = (searchParams.get(FILTER_PARAMS.SORT) as SortDirection) || DEFAULT_SORT_DIRECTION
  const selectedFace = searchParams.get(FILTER_PARAMS.FACE) || null

  // 更新 URL 参数
  const updateSearchParams = useCallback(
    (key: string, value: string | string[] | null) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        params.delete(key)
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','))
      } else {
        params.set(key, value)
      }

      const queryString = params.toString()
      const newUrl = queryString ? `/route?${queryString}` : '/route'

      startTransition(() => {
        router.replace(newUrl, { scroll: false })
      })
    },
    [router, searchParams, startTransition]
  )

  // 处理岩场筛选（单选）— 切换岩场时清除 face 筛选
  // 点击"全部"时重置所有 filter（岩场、岩面、难度、搜索）
  const handleCragSelect = useCallback(
    (cragId: string) => {
      const newCrag = cragId === selectedCrag ? null : cragId
      const params = new URLSearchParams(searchParams.toString())

      if (newCrag) {
        params.set(FILTER_PARAMS.CRAG, newCrag)
      } else {
        // "全部" — 清除所有筛选条件
        params.delete(FILTER_PARAMS.CRAG)
        params.delete(FILTER_PARAMS.GRADE)
        params.delete(FILTER_PARAMS.QUERY)
      }
      params.delete(FILTER_PARAMS.FACE)

      const queryString = params.toString()
      const newUrl = queryString ? `/route?${queryString}` : '/route'
      startTransition(() => {
        router.replace(newUrl, { scroll: false })
      })
    },
    [selectedCrag, searchParams, router, startTransition]
  )

  // 处理岩面筛选
  const handleFaceSelect = useCallback(
    (faceId: string | null) => {
      updateSearchParams(FILTER_PARAMS.FACE, faceId)
    },
    [updateSearchParams]
  )

  // 处理搜索
  const handleSearchChange = useCallback(
    (query: string) => {
      updateSearchParams(FILTER_PARAMS.QUERY, query || null)
    },
    [updateSearchParams]
  )

  // 切换排序方向
  const toggleSortDirection = useCallback(() => {
    const newDirection: SortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    updateSearchParams(FILTER_PARAMS.SORT, newDirection)
  }, [sortDirection, updateSearchParams])

  // 是否有任何 filter 激活（用于 0 结果提示）
  const hasActiveFilters = selectedCrag !== '' || selectedGrades.length > 0 || searchQuery !== '' || selectedFace !== null

  // 清除所有筛选
  const handleClearAllFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(FILTER_PARAMS.CRAG)
    params.delete(FILTER_PARAMS.FACE)
    params.delete(FILTER_PARAMS.GRADE)
    params.delete(FILTER_PARAMS.QUERY)
    const queryString = params.toString()
    startTransition(() => {
      router.replace(queryString ? `/route?${queryString}` : '/route', { scroll: false })
    })
  }, [searchParams, router, startTransition])

  // 处理线路卡片点击
  const handleRouteClick = useCallback((route: Route) => {
    setSelectedRoute(route)
    setIsDetailDrawerOpen(true)
  }, [])

  // 获取选中线路对应的岩场
  const selectedCragData = useMemo(() => {
    if (!selectedRoute) return null
    return crags.find((c) => c.id === selectedRoute.cragId) || null
  }, [selectedRoute, crags])

  // 获取同岩面的线路
  const siblingRoutes = useMemo(() => {
    return getSiblingRoutes(selectedRoute, routes)
  }, [routes, selectedRoute])

  // 处理线路切换
  const handleRouteChange = useCallback((route: Route) => {
    setSelectedRoute(route)
  }, [])

  // Active filter tags 列表（❷ filter 汇总提示）
  const activeFilterTags = useMemo(() => {
    const tags: { label: string; onRemove: () => void }[] = []
    if (selectedFace) {
      tags.push({
        label: selectedFace,
        onRemove: () => updateSearchParams(FILTER_PARAMS.FACE, null),
      })
    }
    if (selectedGrades.length > 0) {
      const label = selectedGrades.length <= 3
        ? selectedGrades.join(', ')
        : `${selectedGrades.length} ${t('selectedGrades', { count: selectedGrades.length }).replace(/^已选 \d+ 个/, '')}`
      tags.push({
        label,
        onRemove: () => updateSearchParams(FILTER_PARAMS.GRADE, null),
      })
    }
    if (searchQuery) {
      tags.push({
        label: `"${searchQuery}"`,
        onRemove: () => updateSearchParams(FILTER_PARAMS.QUERY, null),
      })
    }
    return tags
  }, [selectedFace, selectedGrades, searchQuery, t, updateSearchParams])

  // 筛选逻辑
  const filteredRoutes = useMemo(() => {
    let result = routes

    if (selectedCrag) {
      result = result.filter((r) => r.cragId === selectedCrag)
    }

    if (selectedFace) {
      result = result.filter((r) => {
        const key = r.faceId || `${r.cragId}:${r.area}`
        return key === selectedFace
      })
    }

    if (selectedGrades.length > 0) {
      const allGrades = getGradesByValues(selectedGrades)
      result = result.filter((r) => allGrades.includes(r.grade))
    }

    if (searchQuery.trim()) {
      result = result.filter((r) => matchRouteByQuery(r, searchQuery) !== null)
    }

    result = [...result].sort((a, b) => {
      const comparison = compareGrades(a.grade, b.grade)
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [routes, selectedCrag, selectedFace, selectedGrades, searchQuery, sortDirection])

  return (
    <>
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-surface)',
          transition: 'var(--theme-transition)',
        }}
      >
        {/* 顶部 filter 区域 — 全宽 */}
        <header className="flex-shrink-0 pt-12 px-4 pb-2">
          <FilterChipGroup>
            <FilterChip
              label={tCommon('all')}
              selected={!selectedCrag}
              onClick={() => handleCragSelect('')}
            />
            {crags.map((crag) => (
              <FilterChip
                key={crag.id}
                label={crag.name}
                selected={selectedCrag === crag.id}
                onClick={() => handleCragSelect(crag.id)}
              />
            ))}
          </FilterChipGroup>
        </header>

        {/* 岩面缩略图 — 全宽 */}
        {selectedCrag ? (
          <FaceThumbnailStrip
            selectedCrag={selectedCrag}
            selectedFace={selectedFace}
            onFaceSelect={handleFaceSelect}
          />
        ) : (
          <p
            className="px-4 pb-2 text-xs"
            style={{ color: 'var(--theme-on-surface-variant)', opacity: 0.6 }}
          >
            {t('faceHint')}
          </p>
        )}

        {/* 中间内容区 — flex row */}
        <div className="flex flex-1 min-h-0">
          {/* 左侧 grade bar */}
          <div
            className="flex-shrink-0 pt-2 pb-36 pl-1.5 pr-1"
            style={{ width: 48 }}
          >
            <GradeRangeSelectorVertical
              selectedGrades={selectedGrades}
              onChange={(grades) => updateSearchParams(FILTER_PARAMS.GRADE, grades)}
              className="h-full"
            />
          </div>

          {/* 右侧线路列表 */}
          <main className="flex-1 overflow-y-auto px-4 pb-36">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                {t('totalCount', { count: filteredRoutes.length })}
              </p>
              {/* 排序切换按钮 */}
              <button
                onClick={toggleSortDirection}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors"
                style={{
                  color: 'var(--theme-on-surface-variant)',
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
                aria-label={sortDirection === 'asc' ? t('sortAscHint') : t('sortDescHint')}
              >
                {sortDirection === 'asc' ? (
                  <>
                    <ArrowUp className="w-3 h-3" />
                    <span>{t('sortAsc')}</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3 h-3" />
                    <span>{t('sortDesc')}</span>
                  </>
                )}
              </button>
            </div>

            {/* ❷ Active filter tags */}
            {activeFilterTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {activeFilterTags.map((tag) => (
                  <button
                    key={tag.label}
                    onClick={tag.onRemove}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs transition-all active:scale-95"
                    style={{
                      color: 'var(--theme-primary)',
                      backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)',
                      borderRadius: 'var(--theme-radius-full)',
                    }}
                  >
                    <span className="max-w-24 truncate">{tag.label}</span>
                    <X className="w-3 h-3 flex-shrink-0 opacity-60" />
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {filteredRoutes.map((route, index) => (
                <button
                  key={route.id}
                  onClick={() => handleRouteClick(route)}
                  className={`w-full flex items-center p-3 transition-all active:scale-[0.98] text-left ${
                    !hasInitialRender ? 'animate-fade-in-up' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderRadius: 'var(--theme-radius-xl)',
                    boxShadow: 'var(--theme-shadow-sm)',
                    ...(hasInitialRender ? {} : { animationDelay: `${index * 30}ms` }),
                  }}
                >
                  {/* 难度标签 */}
                  <div
                    className="w-12 h-12 flex items-center justify-center mr-3 flex-shrink-0"
                    style={{
                      backgroundColor: getGradeColor(route.grade),
                      borderRadius: 'var(--theme-radius-lg)',
                    }}
                  >
                    <span className="text-sm font-bold text-white">
                      {route.grade}
                    </span>
                  </div>

                  {/* 线路信息 */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-base font-semibold block truncate"
                      style={{ color: 'var(--theme-on-surface)' }}
                    >
                      {route.name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                      {route.area}
                      {route.FA && ` · FA: ${route.FA}`}
                    </span>
                  </div>

                  {/* 箭头 */}
                  <ChevronRight
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  />
                </button>
              ))}
            </div>

            {filteredRoutes.length === 0 && (
              <div className="text-center py-12">
                <p style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {t('noResults')}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAllFilters}
                    className="mt-3 px-4 py-2 text-sm font-medium transition-all active:scale-95"
                    style={{
                      color: 'var(--theme-primary)',
                      backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
                      borderRadius: 'var(--theme-radius-full)',
                    }}
                  >
                    {t('clearFilters')}
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 悬浮搜索框 */}
      <FloatingSearchInput
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder={tSearch('placeholder')}
      />

      {/* 线路详情抽屉 */}
      <RouteDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        route={selectedRoute}
        siblingRoutes={siblingRoutes}
        crag={selectedCragData}
        onRouteChange={handleRouteChange}
      />

      {/* 底部导航栏 */}
      <AppTabbar />
    </>
  )
}
