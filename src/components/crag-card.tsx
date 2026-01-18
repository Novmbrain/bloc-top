'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Route as RouteIcon } from 'lucide-react'
import type { Crag, Route, WeatherData } from '@/types'
import { getCragTheme } from '@/lib/crag-theme'
import { getGradeColor } from '@/lib/tokens'
import { compareGrades } from '@/lib/grade-utils'
import { WeatherBadge } from '@/components/weather-badge'

interface CragCardProps {
  crag: Crag
  routes: Route[]
  index?: number
  weather?: WeatherData | null
}

export function CragCard({ crag, routes = [], index = 0, weather }: CragCardProps) {
  const routeCount = routes.length
  const theme = getCragTheme(crag.id)

  // 计算难度范围
  const grades = routes
    .map((r) => r.grade)
    .filter((g) => g !== '？')
    .sort(compareGrades)

  const minGrade = grades[0] || 'V0'
  const maxGrade = grades[grades.length - 1] || minGrade
  const gradeRange = minGrade === maxGrade ? minGrade : `${minGrade}-${maxGrade}`

  const hasCoverImage = crag.coverImages && crag.coverImages.length > 0

  return (
    <Link
      href={`/crag/${crag.id}`}
      className="group relative block overflow-hidden rounded-2xl
                 shadow-sm hover:shadow-xl transition-all duration-300
                 active:scale-[0.98] animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* 背景层 - 图片或渐变 */}
      <div className="relative h-44 overflow-hidden">
        {/* 天气角标 */}
        {weather && (
          <WeatherBadge
            temperature={weather.live.temperature}
            weather={weather.live.weather}
          />
        )}

        {hasCoverImage ? (
          // 有封面图时显示图片
          <Image
            src={crag.coverImages![0]}
            alt={crag.name}
            fill
            priority={index < 2}
            sizes="100vw"
            className="object-cover transition-transform duration-500
                       group-hover:scale-105"
          />
        ) : (
          // 无图片时显示渐变背景 + 装饰元素
          <div
            className="absolute inset-0 transition-transform duration-500
                       group-hover:scale-105"
            style={{ background: theme.gradient }}
          >
            {/* 装饰性图标 */}
            <span
              className="absolute right-4 top-4 text-5xl opacity-30
                         transition-all duration-300 group-hover:opacity-50
                         group-hover:scale-110"
            >
              {theme.icon}
            </span>

            {/* 纹理叠加层 */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>
        )}

        {/* 底部渐变遮罩 */}
        <div
          className="absolute inset-0 bg-gradient-to-t
                     from-black/70 via-black/20 to-transparent"
        />

        {/* 内容层 */}
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          {/* 岩场名称 */}
          <h3
            className="text-2xl font-bold text-white tracking-wide
                       drop-shadow-lg"
          >
            {crag.name}
          </h3>

          {/* 信息行 */}
          <div className="flex items-center gap-3 mt-2">
            {/* 线路数量 */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1
                         bg-white/20 backdrop-blur-sm rounded-full"
            >
              <RouteIcon className="w-3.5 h-3.5 text-white" />
              <span className="text-sm text-white font-medium">
                {routeCount} 条线路
              </span>
            </div>

            {/* 难度范围 */}
            <div
              className="px-2.5 py-1 rounded-full text-sm font-bold text-white"
              style={{
                backgroundColor: getGradeColor(minGrade),
                boxShadow: `0 2px 8px ${getGradeColor(minGrade)}40`,
              }}
            >
              {gradeRange}
            </div>
          </div>

          {/* 位置信息 (可选) */}
          {crag.location && (
            <div className="flex items-center gap-1 mt-2 text-white/70">
              <MapPin className="w-3 h-3" />
              <span className="text-xs truncate">{crag.location}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
