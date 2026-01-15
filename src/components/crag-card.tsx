'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Crag } from '@/types'
import { getRoutesByCragId } from '@/data/routes'

interface CragCardProps {
  crag: Crag
  index?: number
}

export function CragCard({ crag, index = 0 }: CragCardProps) {
  const routes = getRoutesByCragId(crag.id)
  const routeCount = routes.length

  // 计算难度范围
  const grades = routes
    .map((r) => r.grade)
    .filter((g) => g !== '？')
    .sort((a, b) => {
      const numA = parseInt(a.replace('V', ''))
      const numB = parseInt(b.replace('V', ''))
      return numA - numB
    })

  const gradeRange =
    grades.length > 0
      ? grades[0] === grades[grades.length - 1]
        ? grades[0]
        : `${grades[0]} - ${grades[grades.length - 1]}`
      : '暂无'

  return (
    <Link
      href={`/crag/${crag.id}`}
      className="flex items-center p-4 bg-white rounded-xl mb-2 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* 岩场信息 */}
      <div className="flex-1 flex flex-col justify-center">
        <span className="text-lg font-bold text-[var(--m3-on-surface)] mb-1 leading-tight">
          {crag.name}
        </span>
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
            {routeCount} 条线路
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--m3-surface-variant)] text-[var(--m3-on-surface-variant)]">
            {gradeRange}
          </span>
        </div>
      </div>

      {/* 箭头指示 */}
      <div className="flex-shrink-0 flex items-center justify-center w-6">
        <ChevronRight className="w-5 h-5 text-[var(--m3-outline)]" />
      </div>
    </Link>
  )
}
