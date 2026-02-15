'use client'

import useSWR from 'swr'
import type { WeatherData, Coordinates } from '@/types'

interface UseWeatherOptions {
  /** 城市 adcode（优先于 coordinates，跳过逆地理编码） */
  adcode?: string
  /** 坐标（仅在 adcode 未提供时使用） */
  coordinates?: Coordinates | null
  /** 是否获取预报数据（默认 true） */
  forecast?: boolean
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Weather API failed')
  return res.json()
})

/**
 * 天气数据获取 Hook
 * 使用 SWR 实现请求去重和跨组件缓存共享
 */
export function useWeather({ adcode, coordinates, forecast = true }: UseWeatherOptions = {}) {
  const params = new URLSearchParams()
  if (adcode) {
    params.set('adcode', adcode)
  } else if (coordinates) {
    params.set('lng', String(coordinates.lng))
    params.set('lat', String(coordinates.lat))
  }
  if (!forecast) {
    params.set('forecast', 'false')
  }

  // 只有有查询参数时才发起请求
  const key = params.toString() ? `/api/weather?${params.toString()}` : null

  const { data, error, isLoading } = useSWR<WeatherData>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 分钟内相同 key 去重
  })

  return {
    weather: data ?? null,
    loading: isLoading,
    error: !!error,
  }
}
