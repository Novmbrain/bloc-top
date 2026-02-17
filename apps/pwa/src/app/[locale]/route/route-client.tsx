'use client'

import { useMemo, useCallback, useState, useTransition, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { getGradeColor } from '@/lib/tokens'
import { FILTER_PARAMS, getGradesByValues, DEFAULT_SORT_DIRECTION, type SortDirection } from '@/lib/filter-constants'
import { compareGrades } from '@/lib/grade-utils'
import { getSiblingRoutes } from '@/lib/route-utils'
import { matchRouteByQuery } from '@/hooks/use-route-search'
import { GradeRangeSelectorVertical } from '@/components/grade-range-selector-vertical'
import { RouteFilterBar } from '@/components/route-filter-bar'
import { CollapsedFilterSummary } from '@/components/collapsed-filter-summary'
import { FloatingSearchInput } from '@/components/floating-search-input'
import { RouteDetailDrawer } from '@/components/route-detail-drawer'
import { AppTabbar } from '@/components/app-tabbar'
import type { Route, Crag } from '@/types'

const MAX_ANIMATED_CARDS = 10

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
  const [isPending, startTransition] = useTransition()

  // 抽屉状态
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

  // 入场动画控制
  const [hasInitialRender, setHasInitialRender] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setHasInitialRender(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // 滚动关联折叠动画 — CSS 自定义属性驱动，避免每帧 React 重渲染
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const filterBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const main = mainRef.current
    const container = containerRef.current
    const filterBar = filterBarRef.current
    if (!main || !container) return

    let raf: number
    let prevCollapsed = false

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const fbh = filterBar?.offsetHeight || 150
        const threshold = Math.max(fbh * 0.8, 60)
        const progress = Math.min(1, main.scrollTop / threshold)
        container.style.setProperty('--cp', String(progress))

        // 搜索栏在进度 > 0.6 时折叠（带 CSS transition 平滑过渡）
        const collapsed = progress > 0.6
        if (collapsed !== prevCollapsed) {
          prevCollapsed = collapsed
          setIsSearchCollapsed(collapsed)
        }
      })
    }

    // 初始化筛选栏高度
    if (filterBar) {
      container.style.setProperty('--fbh', `${filterBar.offsetHeight}px`)
    }

    // 跟踪筛选栏高度变化（岩场选择导致内容变化）
    const ro = filterBar
      ? new ResizeObserver((entries) => {
          container.style.setProperty('--fbh', `${entries[0].contentRect.height}px`)
        })
      : null
    if (filterBar) ro?.observe(filterBar)

    main.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      main.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [])

  // 从 URL 读取筛选状态
  const selectedCity = searchParams.get(FILTER_PARAMS.CITY) || ''
  const selectedCrag = searchParams.get(FILTER_PARAMS.CRAG) || ''
  const gradeParam = searchParams.get(FILTER_PARAMS.GRADE)
  const selectedGrades = useMemo(
    () => (gradeParam ? gradeParam.split(',') : []),
    [gradeParam]
  )
  const searchQuery = searchParams.get(FILTER_PARAMS.QUERY) || ''
  const sortDirection = (searchParams.get(FILTER_PARAMS.SORT) as SortDirection) || DEFAULT_SORT_DIRECTION
  const selectedFace = searchParams.get(FILTER_PARAMS.FACE) || null

  // 城市级预过滤（在其他 filter 之前执行）
  const cityFilteredCrags = useMemo(() => {
    if (!selectedCity) return crags
    return crags.filter(c => (c.cityId || 'luoyuan') === selectedCity)
  }, [crags, selectedCity])

  const cityFilteredRoutes = useMemo(() => {
    if (!selectedCity) return routes
    const cragIds = new Set(cityFilteredCrags.map(c => c.id))
    return routes.filter(r => cragIds.has(r.cragId))
  }, [routes, cityFilteredCrags, selectedCity])

  // 计算当前路线池中实际存在的难度等级
  const availableGrades = useMemo(() => {
    const pool = selectedCrag
      ? cityFilteredRoutes.filter((r) => r.cragId === selectedCrag)
      : cityFilteredRoutes
    const gradeSet = new Set(pool.map((r) => r.grade))
    // 按难度排序，"？"放最后
    return [...gradeSet].sort((a, b) => {
      if (a === '？') return 1
      if (b === '？') return -1
      return compareGrades(a, b)
    })
  }, [cityFilteredRoutes, selectedCrag])

  // 切换岩场时，清除不在新岩场中的已选难度
  useEffect(() => {
    if (selectedGrades.length === 0) return
    const validGrades = selectedGrades.filter((g) => availableGrades.includes(g))
    if (validGrades.length !== selectedGrades.length) {
      updateSearchParams(FILTER_PARAMS.GRADE, validGrades.length > 0 ? validGrades : null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 availableGrades 变化时检查
  }, [availableGrades])

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

  // 处理岩面筛选 — 选中后自动折叠筛选栏展示结果
  const handleFaceSelect = useCallback(
    (faceId: string | null) => {
      updateSearchParams(FILTER_PARAMS.FACE, faceId)
      if (faceId && mainRef.current) {
        const fbh = filterBarRef.current?.offsetHeight || 150
        // 仅在筛选栏展开时触发自动折叠
        if (mainRef.current.scrollTop < fbh * 0.3) {
          requestAnimationFrame(() => {
            mainRef.current?.scrollTo({ top: fbh, behavior: 'smooth' })
          })
        }
      }
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

  // 展开 filter bar — 滚回顶部，IO 自动检测 sentinel 恢复展开
  const handleExpand = useCallback(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

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

  // 获取选中线路对应的岩场（从全量 crags 查找，因为详情抽屉不受城市过滤影响）
  const selectedCragData = useMemo(() => {
    if (!selectedRoute) return null
    return crags.find((c) => c.id === selectedRoute.cragId) || null
  }, [selectedRoute, crags])

  // 获取同岩面的线路
  const siblingRoutes = useMemo(() => {
    return getSiblingRoutes(selectedRoute, cityFilteredRoutes)
  }, [cityFilteredRoutes, selectedRoute])

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
      // 显示难度范围：≤3 个列出全部，>3 个显示首尾范围如 "V2–V7"
      const sorted = [...selectedGrades].sort((a, b) => compareGrades(a, b))
      const label = selectedGrades.length <= 3
        ? sorted.join(', ')
        : `${sorted[0]}–${sorted[sorted.length - 1]}`
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

  // 折叠态摘要信息
  const selectedCragName = useMemo(() => {
    if (!selectedCrag) return null
    return cityFilteredCrags.find(c => c.id === selectedCrag)?.name || null
  }, [selectedCrag, cityFilteredCrags])

  const gradeRangeLabel = useMemo(() => {
    if (selectedGrades.length === 0) return null
    const sorted = [...selectedGrades].sort((a, b) => compareGrades(a, b))
    return selectedGrades.length <= 2
      ? sorted.join(', ')
      : `${sorted[0]}–${sorted[sorted.length - 1]}`
  }, [selectedGrades])

  // 筛选逻辑
  const filteredRoutes = useMemo(() => {
    let result = cityFilteredRoutes

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
  }, [cityFilteredRoutes, selectedCrag, selectedFace, selectedGrades, searchQuery, sortDirection])

  return (
    <>
      <div
        ref={containerRef}
        className="flex flex-col h-dvh overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-surface)',
          transition: 'var(--theme-transition)',
          '--cp': '0',
          '--fbh': '150px',
        } as React.CSSProperties}
      >
        {/* 折叠态摘要 — 高度从 0 渐增，跟随滚动进度 */}
        <div
          className="flex-shrink-0 overflow-hidden relative z-10"
          style={{
            height: 'calc(var(--cp) * (2.75rem + env(safe-area-inset-top, 0px)))',
            opacity: 'var(--cp)',
            pointerEvents: isSearchCollapsed ? 'auto' : 'none',
          } as React.CSSProperties}
        >
          <CollapsedFilterSummary
            selectedCragName={selectedCragName}
            selectedFaceName={selectedFace}
            gradeRangeLabel={gradeRangeLabel}
            searchQuery={searchQuery || null}
            sortDirection={sortDirection}
            onToggleSort={toggleSortDirection}
            filteredCount={filteredRoutes.length}
            onExpand={handleExpand}
          />
        </div>

        {/* 展开态 filter bar — 负 margin 向上滑出，释放空间给内容区 */}
        <div
          ref={filterBarRef}
          className="flex-shrink-0"
          style={{
            marginTop: 'calc(var(--cp) * var(--fbh) * -1)',
            opacity: 'calc(1 - var(--cp))',
            pointerEvents: isSearchCollapsed ? 'none' : 'auto',
          } as React.CSSProperties}
        >
          <RouteFilterBar
            crags={cityFilteredCrags}
            selectedCrag={selectedCrag}
            onCragSelect={handleCragSelect}
            selectedFace={selectedFace}
            onFaceSelect={handleFaceSelect}
            sortDirection={sortDirection}
            onToggleSort={toggleSortDirection}
            filteredCount={filteredRoutes.length}
            activeFilterTags={activeFilterTags}
            allLabel={tCommon('all')}
            totalCountLabel={t('totalCount', { count: filteredRoutes.length })}
            sortAscLabel={t('sortAsc')}
            sortDescLabel={t('sortDesc')}
            sortAscHint={t('sortAscHint')}
            sortDescHint={t('sortDescHint')}
            faceHintLabel={t('faceHint')}
          />
        </div>

        {/* 中间内容区 — flex row */}
        <div className="flex flex-1 min-h-0">
          {/* 左侧 grade bar */}
          <div
            className="flex-shrink-0 pt-2 pb-36 pl-1.5 pr-1"
            style={{ width: 48 }}
          >
            <GradeRangeSelectorVertical
              availableGrades={availableGrades}
              selectedGrades={selectedGrades}
              onChange={(grades) => updateSearchParams(FILTER_PARAMS.GRADE, grades)}
              className="h-full"
            />
          </div>

          {/* 右侧线路列表 */}
          <main
            ref={mainRef}
            className="flex-1 overflow-y-auto px-4 pb-36"
            style={{
              opacity: isPending ? 0.6 : 1,
              transition: 'opacity 150ms ease',
              pointerEvents: isPending ? 'none' : undefined,
            }}
          >
            {/* 滚动进度直接驱动动画，无需 sentinel */}
            <div className="space-y-2">
              {filteredRoutes.map((route, index) => (
                <button
                  key={route.id}
                  onClick={() => handleRouteClick(route)}
                  className={`w-full flex items-center p-3 transition-all active:scale-[0.98] text-left ${
                    !hasInitialRender && index < MAX_ANIMATED_CARDS ? 'animate-fade-in-up' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderRadius: 'var(--theme-radius-xl)',
                    boxShadow: 'var(--theme-shadow-sm)',
                    contentVisibility: 'auto' as React.CSSProperties['contentVisibility'],
                    containIntrinsicSize: '0 72px',
                    ...(!hasInitialRender && index < MAX_ANIMATED_CARDS ? { animationDelay: `${index * 30}ms` } : {}),
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
        isCollapsed={isSearchCollapsed}
        onExpandClick={handleExpand}
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
