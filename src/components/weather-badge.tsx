'use client'

import { getWeatherIcon } from '@/lib/weather-constants'

interface WeatherBadgeProps {
  temperature: number
  weather: string
}

/**
 * 卡片天气角标
 * 显示在岩场卡片右上角，展示温度和天气图标
 */
export function WeatherBadge({ temperature, weather }: WeatherBadgeProps) {
  const icon = getWeatherIcon(weather)

  return (
    <div
      className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1
                 bg-black/50 backdrop-blur-sm rounded-full z-10"
    >
      <span className="text-white text-sm font-medium">{temperature}°</span>
      <span className="text-sm">{icon}</span>
    </div>
  )
}
