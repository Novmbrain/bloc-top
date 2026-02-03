'use client'

import Link from 'next/link'
import { MapPin, GitBranch } from 'lucide-react'
import type { Crag, Route, WeatherData } from '@/types'
import { getCragTheme } from '@/lib/crag-theme'
import { compareGrades } from '@/lib/grade-utils'
import { WeatherBadge } from '@/components/weather-badge'
import { DownloadButton } from '@/components/download-button'
import { useOfflineDownloadContextSafe } from '@/components/offline-download-provider'

interface CragCardProps {
  crag: Crag
  routes: Route[]
  index?: number
  weather?: WeatherData | null
  showDownload?: boolean  // 是否显示下载按钮
}

export function CragCard({ crag, routes = [], index = 0, weather, showDownload = true }: CragCardProps) {
  const routeCount = routes.length
  const theme = getCragTheme(crag.id)

  // 获取离线下载 Context (可能为 null)
  const offlineDownload = useOfflineDownloadContextSafe()

  // 计算难度范围
  const grades = routes
    .map((r) => r.grade)
    .filter((g) => g !== '？')
    .sort(compareGrades)

  const minGrade = grades[0] || 'V0'
  const maxGrade = grades[grades.length - 1] || minGrade
  const gradeRange = minGrade === maxGrade ? minGrade : `${minGrade}-${maxGrade}`

  return (
    <Link
      href={`/crag/${crag.id}`}
      className="group relative block overflow-hidden rounded-2xl p-4
                 shadow-sm hover:shadow-xl transition-all duration-300
                 active:scale-[0.97] active:shadow-md
                 animate-fade-in-up touch-manipulation"
      style={{
        animationDelay: `${index * 80}ms`,
        background: theme.gradient,
      }}
    >
      {/* 垂直布局容器 */}
      <div className="flex flex-col gap-3">
        {/* 顶部行: 标题 + 操作按钮 */}
        <div className="flex items-start justify-between gap-2">
          {/* 岩场名称 */}
          <h3 className="text-[22px] font-bold text-white leading-tight">
            {crag.name}
          </h3>

          {/* 操作按钮组 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 下载按钮 */}
            {showDownload && offlineDownload && offlineDownload.isSupported && (
              <DownloadButton
                crag={crag}
                routes={routes}
                isDownloaded={offlineDownload.isDownloaded(crag.id)}
                progress={offlineDownload.downloadProgress}
                onDownload={offlineDownload.downloadCrag}
                onDelete={offlineDownload.deleteCrag}
                className="!w-8 !h-8 !rounded-lg"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  boxShadow: 'none',
                }}
              />
            )}

            {/* 天气徽章 */}
            {weather && (
              <WeatherBadge
                temperature={weather.live.temperature}
                weather={weather.live.weather}
                className="!h-7 !rounded-lg"
                style={{
                  backgroundColor: 'rgba(12, 12, 12, 0.8)',
                }}
              />
            )}
          </div>
        </div>

        {/* 标签行: 线路数 + 难度范围 */}
        <div className="flex items-center gap-2">
          {/* 线路数量标签 */}
          <div
            className="flex items-center gap-1.5 h-[26px] px-2.5 rounded-md"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <GitBranch className="w-3.5 h-3.5 text-white" />
            <span className="text-xs text-white font-medium">
              {routeCount} 条线路
            </span>
          </div>

          {/* 难度范围标签 */}
          <div
            className="h-[26px] px-2.5 rounded-md flex items-center"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0C0C0C',
            }}
          >
            <span className="text-xs font-bold">{gradeRange}</span>
          </div>
        </div>

        {/* 位置信息行 */}
        {crag.location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" style={{ color: 'rgba(255, 255, 255, 0.67)' }} />
            <span
              className="text-[11px] truncate"
              style={{ color: 'rgba(255, 255, 255, 0.67)' }}
            >
              {crag.location}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
