'use client'

import { useMemo, useCallback, useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronRight, X, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react'
import { getGradeColor } from '@/lib/tokens'
import { FILTER_PARAMS, getGradesByValues, DEFAULT_SORT_DIRECTION, type SortDirection } from '@/lib/filter-constants'
import { compareGrades } from '@/lib/grade-utils'
import { FilterChip, FilterChipGroup } from '@/components/filter-chip'
import { GradeRangeSelector } from '@/components/grade-range-selector'
import { RouteDetailDrawer } from '@/components/route-detail-drawer'
import { FilterDrawer } from '@/components/filter-drawer'
import { AppTabbar } from '@/components/app-tabbar'
import type { Route, Crag } from '@/types'

interface RouteListClientProps {
  routes: Route[]
  crags: Crag[]
}

export default function RouteListClient({ routes, crags }: RouteListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // 抽屉状态
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

  // 是否已完成首次渲染（用于控制入场动画）
  const [hasInitialRender, setHasInitialRender] = useState(false)

  // 首次渲染完成后标记，避免后续筛选/排序时重复播放入场动画
  useEffect(() => {
    // 等待入场动画完成后再标记
    const timer = setTimeout(() => setHasInitialRender(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // 从 URL 读取筛选状态
  const selectedCrag = searchParams.get(FILTER_PARAMS.CRAG) || ''
  const gradeParam = searchParams.get(FILTER_PARAMS.GRADE)
  // 使用 useMemo 避免每次渲染创建新数组，依赖 gradeParam 字符串确保响应性
  const selectedGrades = useMemo(
    () => (gradeParam ? gradeParam.split(',') : []),
    [gradeParam]
  )
  const searchQuery = searchParams.get(FILTER_PARAMS.QUERY) || ''
  const sortDirection = (searchParams.get(FILTER_PARAMS.SORT) as SortDirection) || DEFAULT_SORT_DIRECTION

  // 更新 URL 参数（使用 startTransition 实现平滑更新，避免闪烁）
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

      // 使用 startTransition 将路由更新标记为非紧急，避免阻塞 UI
      startTransition(() => {
        router.replace(newUrl, { scroll: false })
      })
    },
    [router, searchParams, startTransition]
  )

  // 处理岩场筛选（单选）
  const handleCragSelect = useCallback(
    (cragId: string) => {
      updateSearchParams(FILTER_PARAMS.CRAG, cragId === selectedCrag ? null : cragId)
    },
    [selectedCrag, updateSearchParams]
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

  // 处理筛选抽屉应用
  const handleFilterApply = useCallback(
    (crag: string, grades: string[]) => {
      const params = new URLSearchParams(searchParams.toString())

      if (crag) {
        params.set(FILTER_PARAMS.CRAG, crag)
      } else {
        params.delete(FILTER_PARAMS.CRAG)
      }

      if (grades.length > 0) {
        params.set(FILTER_PARAMS.GRADE, grades.join(','))
      } else {
        params.delete(FILTER_PARAMS.GRADE)
      }

      const queryString = params.toString()
      startTransition(() => {
        router.replace(queryString ? `/route?${queryString}` : '/route', { scroll: false })
      })
    },
    [router, searchParams, startTransition]
  )

  // 处理线路卡片点击
  const handleRouteClick = useCallback((route: Route) => {
    setSelectedRoute(route)
    setIsDetailDrawerOpen(true)
  }, [])

  // 活跃筛选数量（用于显示徽章）
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedCrag) count++
    count += selectedGrades.length
    return count
  }, [selectedCrag, selectedGrades])

  // 获取当前选中岩场名称
  const currentCragName = useMemo(() => {
    if (!selectedCrag) return '全部线路'
    const crag = crags.find((c) => c.id === selectedCrag)
    return crag?.name || '全部线路'
  }, [selectedCrag, crags])

  // 获取选中线路对应的岩场
  const selectedCragData = useMemo(() => {
    if (!selectedRoute) return null
    return crags.find((c) => c.id === selectedRoute.cragId) || null
  }, [selectedRoute, crags])

  // 筛选逻辑
  const filteredRoutes = useMemo(() => {
    let result = routes

    // 岩场筛选
    if (selectedCrag) {
      result = result.filter((r) => r.cragId === selectedCrag)
    }

    // 难度筛选（多选）
    if (selectedGrades.length > 0) {
      const allGrades = getGradesByValues(selectedGrades)
      result = result.filter((r) => allGrades.includes(r.grade))
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.grade.toLowerCase().includes(query) ||
          r.area?.toLowerCase().includes(query)
      )
    }

    // 按难度排序
    result = [...result].sort((a, b) => {
      const comparison = compareGrades(a.grade, b.grade)
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [routes, selectedCrag, selectedGrades, searchQuery, sortDirection])

  return (
    <>
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-surface)',
          transition: 'var(--theme-transition)',
        }}
      >
        {/* 头部 */}
        <header className="flex-shrink-0 pt-12 px-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl font-bold flex-1" style={{ color: 'var(--theme-on-surface)' }}>
              {currentCragName}
            </h1>
            {/* 筛选按钮 */}
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="relative w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
              aria-label="筛选"
            >
              <SlidersHorizontal className="w-5 h-5" style={{ color: 'var(--theme-on-surface)' }} />
              {activeFilterCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-on-primary)',
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative mb-3">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            />
            <input
              type="text"
              placeholder="搜索线路名称"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-10 text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                color: 'var(--theme-on-surface)',
                borderRadius: 'var(--theme-radius-full)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--theme-on-surface-variant)' }}
              >
                <X className="w-3 h-3" style={{ color: 'var(--theme-surface)' }} />
              </button>
            )}
          </div>

          {/* 岩场筛选（第一行） */}
          <FilterChipGroup className="mb-2">
            <FilterChip
              label="全部"
              selected={!selectedCrag}
              onClick={() => updateSearchParams(FILTER_PARAMS.CRAG, null)}
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

          {/* 难度筛选（色谱条） */}
          <GradeRangeSelector
            selectedGrades={selectedGrades}
            onChange={(grades) => updateSearchParams(FILTER_PARAMS.GRADE, grades)}
            className="mt-3"
          />
        </header>

        {/* 线路列表 */}
        <main className="flex-1 overflow-y-auto px-4 pb-28">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
              共 {filteredRoutes.length} 条线路
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
              aria-label={sortDirection === 'asc' ? '当前：从简单到难，点击反转' : '当前：从难到简单，点击反转'}
            >
              {sortDirection === 'asc' ? (
                <>
                  <ArrowUp className="w-3 h-3" />
                  <span>简单→难</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3 h-3" />
                  <span>难→简单</span>
                </>
              )}
            </button>
          </div>

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
                {/* 难度标签 - 实色背景，与难度选择 bar 颜色一致 */}
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
                没有找到匹配的线路
              </p>
            </div>
          )}
        </main>
      </div>

      {/* 线路详情抽屉 */}
      <RouteDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        route={selectedRoute}
        crag={selectedCragData}
      />

      {/* 筛选抽屉 */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        crags={crags}
        selectedCrag={selectedCrag}
        selectedGrades={selectedGrades}
        onApply={handleFilterApply}
      />

      {/* 底部导航栏 */}
      <AppTabbar />
    </>
  )
}
