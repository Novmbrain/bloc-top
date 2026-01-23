'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Cloud, Droplets, Wind, ThermometerSun } from 'lucide-react'
import type { WeatherData, Coordinates } from '@/types'
import { getWeatherIcon, SUITABILITY_CONFIG } from '@/lib/weather-constants'
import { getSuitabilityIcon, isToday } from '@/lib/weather-utils'

interface WeatherCardProps {
  coordinates?: Coordinates
  delay?: number
}

/**
 * 详情页天气卡片
 * 显示完整天气信息，包含实况、适宜度评估和 3 日预报
 */
export function WeatherCard({ coordinates, delay = 0 }: WeatherCardProps) {
  const t = useTranslations('Weather')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true)
        setError(false)

        const params = new URLSearchParams()
        if (coordinates) {
          params.set('lng', String(coordinates.lng))
          params.set('lat', String(coordinates.lat))
        }

        const response = await fetch(`/api/weather?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Weather API failed')
        }

        const data: WeatherData = await response.json()
        setWeather(data)
      } catch (err) {
        console.error('[WeatherCard] Failed to fetch weather:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [coordinates])

  // 加载中 - 显示骨架屏
  if (loading) {
    return (
      <div
        className="p-3 mb-2 animate-fade-in-up"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderRadius: 'var(--theme-radius-xl)',
          boxShadow: 'var(--theme-shadow-sm)',
          animationDelay: `${delay}ms`,
        }}
      >
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-full skeleton-shimmer mr-2" />
          <div className="h-5 w-20 rounded skeleton-shimmer" />
        </div>
        <div className="space-y-3">
          <div className="h-16 rounded-lg skeleton-shimmer" />
          <div className="h-20 rounded-lg skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // 错误时静默失败
  if (error || !weather) {
    return null
  }

  const { live, climbing, forecasts } = weather
  const suitabilityConfig = SUITABILITY_CONFIG[climbing.level]

  return (
    <div
      className="p-3 mb-2 animate-fade-in-up"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderRadius: 'var(--theme-radius-xl)',
        boxShadow: 'var(--theme-shadow-sm)',
        animationDelay: `${delay}ms`,
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 标题 */}
      <div className="flex items-center mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
          }}
        >
          <Cloud className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
        </div>
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          {t('liveWeather')}
        </span>
      </div>

      {/* 当前天气 */}
      <div
        className="p-3 rounded-xl mb-3"
        style={{ backgroundColor: 'var(--theme-surface-variant)' }}
      >
        <div className="flex items-center justify-between mb-2">
          {/* 温度 + 天气 */}
          <div className="flex items-center gap-2">
            <span className="text-3xl">{getWeatherIcon(live.weather)}</span>
            <div>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-3xl font-bold"
                  style={{ color: 'var(--theme-on-surface)' }}
                >
                  {live.temperature}°
                </span>
                <span
                  className="text-sm"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {live.weather}
                </span>
              </div>
            </div>
          </div>

          {/* 详细数据 */}
          <div className="flex flex-col gap-1 text-right">
            <div
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              <Droplets className="w-3 h-3" />
              <span>{t('humidityValue', { value: live.humidity })}</span>
            </div>
            <div
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              <Wind className="w-3 h-3" />
              <span>{t('windValue', { direction: live.windDirection, power: live.windPower })}</span>
            </div>
          </div>
        </div>

        {/* 攀岩适宜度 */}
        <div
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ backgroundColor: suitabilityConfig.bgColor }}
        >
          <span className="text-lg">{getSuitabilityIcon(climbing.level)}</span>
          <div className="flex-1">
            <span
              className="text-sm font-medium"
              style={{ color: suitabilityConfig.color }}
            >
              {t('climbingLabel', { level: t(climbing.level) })}
            </span>
            <span
              className="text-xs ml-2"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {t(`${climbing.level}Desc`)}
            </span>
          </div>
        </div>
      </div>

      {/* 未来天气预报 */}
      {forecasts && forecasts.length > 0 && (
        <div>
          <div
            className="text-xs font-medium mb-2"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {t('futureWeather')}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {forecasts.slice(0, 3).map((forecast, index) => (
              <ForecastItem
                key={forecast.date}
                forecast={forecast}
                isFirst={index === 0}
                t={t}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ForecastItemProps {
  forecast: {
    date: string
    week: string
    dayWeather: string
    nightWeather: string
    dayTemp: number
    nightTemp: number
  }
  isFirst: boolean
  t: ReturnType<typeof useTranslations<'Weather'>>
}

// 星期数字到翻译键的映射 (高德 API: 1=周一, 7=周日)
const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

function ForecastItem({ forecast, t }: ForecastItemProps) {
  // 将高德 API 的 week (1-7) 转换为翻译键
  const weekIndex = parseInt(forecast.week, 10)
  const weekdayKey = weekIndex === 7 ? WEEKDAY_KEYS[0] : WEEKDAY_KEYS[weekIndex]
  const dayLabel = isToday(forecast.date) ? t('today') : t(weekdayKey)

  return (
    <div
      className="flex flex-col items-center p-2 rounded-lg"
      style={{ backgroundColor: 'var(--theme-surface-variant)' }}
    >
      <span
        className="text-xs font-medium mb-1"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        {dayLabel}
      </span>
      <span className="text-xl mb-1">{getWeatherIcon(forecast.dayWeather)}</span>
      <div className="flex items-center gap-1">
        <ThermometerSun className="w-3 h-3" style={{ color: 'var(--theme-on-surface-variant)' }} />
        <span
          className="text-xs"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          {forecast.nightTemp}° / {forecast.dayTemp}°
        </span>
      </div>
    </div>
  )
}
