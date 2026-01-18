'use client'

import { useEffect, useState } from 'react'
import { Droplets } from 'lucide-react'
import type { WeatherData } from '@/types'
import { getWeatherIcon, SUITABILITY_CONFIG } from '@/lib/weather-constants'
import { getSuitabilityIcon } from '@/lib/weather-utils'

interface WeatherStripProps {
  lng?: number
  lat?: number
}

export function WeatherStrip({ lng, lat }: WeatherStripProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true)
        setError(false)

        const params = new URLSearchParams()
        if (lng !== undefined) params.set('lng', String(lng))
        if (lat !== undefined) params.set('lat', String(lat))

        const response = await fetch(`/api/weather?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Weather API failed')
        }

        const data: WeatherData = await response.json()
        setWeather(data)
      } catch (err) {
        console.error('[WeatherStrip] Failed to fetch weather:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [lng, lat])

  // 加载中 - 显示骨架屏
  if (loading) {
    return (
      <div
        className="flex items-center gap-2 py-2 px-3 mb-3 animate-pulse"
        style={{
          backgroundColor: 'var(--theme-surface-variant)',
          borderRadius: 'var(--theme-radius-lg)',
        }}
      >
        <div className="w-6 h-6 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-1">
          <div className="h-4 w-24 rounded skeleton-shimmer" />
          <div className="h-3 w-32 rounded skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // 错误时静默失败 - 不显示天气条
  if (error || !weather) {
    return null
  }

  const { live, climbing } = weather
  const suitabilityConfig = SUITABILITY_CONFIG[climbing.level]
  const weatherIcon = getWeatherIcon(live.weather)
  const suitabilityIcon = getSuitabilityIcon(climbing.level)

  return (
    <div
      className="flex items-center gap-3 py-2 px-3 mb-3 animate-fade-in"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface))',
        borderRadius: 'var(--theme-radius-lg)',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 天气图标 + 温度 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xl">{weatherIcon}</span>
        <span
          className="text-lg font-semibold"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          {live.temperature}°
        </span>
      </div>

      {/* 分隔线 */}
      <div
        className="w-px h-6"
        style={{ backgroundColor: 'var(--theme-outline-variant)' }}
      />

      {/* 适宜度 + 描述 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{suitabilityIcon}</span>
          <span
            className="text-sm font-medium"
            style={{ color: suitabilityConfig.color }}
          >
            {suitabilityConfig.label}
          </span>
          <span
            className="text-sm"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            · {live.weather}
          </span>
        </div>
      </div>

      {/* 湿度 */}
      <div
        className="flex items-center gap-1 flex-shrink-0"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        <Droplets className="w-3.5 h-3.5" />
        <span className="text-xs">{live.humidity}%</span>
      </div>
    </div>
  )
}
