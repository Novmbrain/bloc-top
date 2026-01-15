'use client'

import { Suspense, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Search, ChevronRight } from 'lucide-react'
import { getAllRoutes, getRoutesByCragId } from '@/data/routes'
import { getAllCrags } from '@/data/crags'
import { getGradeColor } from '@/lib/tokens'

function RouteListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cragFilter = searchParams.get('crag')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])

  const allRoutes = cragFilter ? getRoutesByCragId(cragFilter) : getAllRoutes()
  const crags = getAllCrags()
  const currentCrag = crags.find((c) => c.id === cragFilter)

  // 难度分组
  const gradeGroups = [
    { label: 'V0-V3', grades: ['V0', 'V1', 'V2', 'V3'] },
    { label: 'V4-V6', grades: ['V4', 'V5', 'V6'] },
    { label: 'V7+', grades: ['V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13'] },
  ]

  // 筛选逻辑
  const filteredRoutes = useMemo(() => {
    let routes = allRoutes

    // 难度筛选
    if (selectedGrades.length > 0) {
      const allGrades = selectedGrades.flatMap(
        (label) => gradeGroups.find((g) => g.label === label)?.grades || []
      )
      routes = routes.filter((r) => allGrades.includes(r.grade))
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      routes = routes.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.grade.toLowerCase().includes(query)
      )
    }

    return routes
  }, [allRoutes, selectedGrades, searchQuery])

  const toggleGradeFilter = (label: string) => {
    setSelectedGrades((prev) =>
      prev.includes(label)
        ? prev.filter((g) => g !== label)
        : [...prev, label]
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--m3-surface)]">
      {/* 头部 */}
      <header className="flex-shrink-0 pt-12 px-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-[var(--m3-surface-variant)] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--m3-on-surface)]" />
          </button>
          <h1 className="text-2xl font-bold text-[var(--m3-on-surface)]">
            {currentCrag?.name || '全部线路'}
          </h1>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--m3-outline)]" />
          <input
            type="text"
            placeholder="搜索线路名称"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-[var(--m3-surface-variant)] text-[var(--m3-on-surface)] placeholder:text-[var(--m3-outline)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--m3-primary)]"
          />
        </div>

        {/* 难度筛选 */}
        <div className="flex gap-2">
          {gradeGroups.map((group) => (
            <button
              key={group.label}
              onClick={() => toggleGradeFilter(group.label)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedGrades.includes(group.label)
                  ? 'bg-[var(--m3-primary)] text-white'
                  : 'bg-[var(--m3-surface-variant)] text-[var(--m3-on-surface-variant)]'
              }`}
            >
              {group.label}
            </button>
          ))}
          {selectedGrades.length > 0 && (
            <button
              onClick={() => setSelectedGrades([])}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-[var(--m3-primary)]"
            >
              清除
            </button>
          )}
        </div>
      </header>

      {/* 线路列表 */}
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="text-xs text-[var(--m3-outline)] mb-2">
          共 {filteredRoutes.length} 条线路
        </p>

        <div className="space-y-2">
          {filteredRoutes.map((route, index) => (
            <Link
              key={route.id}
              href={`/route/${route.id}`}
              className="flex items-center p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] animate-fade-in-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* 难度标签 */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
                style={{ backgroundColor: getGradeColor(route.grade) + '20' }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: getGradeColor(route.grade) }}
                >
                  {route.grade}
                </span>
              </div>

              {/* 线路信息 */}
              <div className="flex-1 min-w-0">
                <span className="text-base font-semibold text-[var(--m3-on-surface)] block truncate">
                  {route.name}
                </span>
                <span className="text-xs text-[var(--m3-on-surface-variant)]">
                  {route.area}
                  {route.FA && ` · FA: ${route.FA}`}
                </span>
              </div>

              {/* 箭头 */}
              <ChevronRight className="w-5 h-5 text-[var(--m3-outline)] flex-shrink-0" />
            </Link>
          ))}
        </div>

        {filteredRoutes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--m3-on-surface-variant)]">
              没有找到匹配的线路
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function RouteListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--m3-primary)] border-t-transparent" />
        </div>
      }
    >
      <RouteListContent />
    </Suspense>
  )
}
