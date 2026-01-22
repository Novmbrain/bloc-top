'use client'

import { getWeatherIcon } from '@/lib/weather-constants'

interface WeatherBadgeProps {
  temperature: number
  weather: string
}

/**
 * 卡片天气角标
 * 显示温度和天气图标，位置由父容器控制
 */
export function WeatherBadge({ temperature, weather }: WeatherBadgeProps) {
  const icon = getWeatherIcon(weather)

  return (
    <div
      className="flex items-center gap-1 px-2 py-1
                 bg-black/50 backdrop-blur-sm rounded-full"
    >
      <span className="text-white text-sm font-medium">{temperature}°</span>
      <span className="text-sm">{icon}</span>
    </div>
  )
}
