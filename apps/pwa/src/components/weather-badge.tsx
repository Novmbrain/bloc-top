'use client'

import { getWeatherIcon } from '@/lib/weather-constants'
import { cn } from '@/lib/utils'

interface WeatherBadgeProps {
  temperature: number
  weather: string
  className?: string
  style?: React.CSSProperties
}

/**
 * 卡片天气角标
 * 显示温度和天气图标，位置由父容器控制
 */
export function WeatherBadge({ temperature, weather, className, style }: WeatherBadgeProps) {
  const icon = getWeatherIcon(weather)

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1',
        'glass-light rounded-full',
        className
      )}
      style={style}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>{temperature}°</span>
      <span className="text-sm">{icon}</span>
    </div>
  )
}
