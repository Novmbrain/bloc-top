'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CITIES,
  DEFAULT_CITY_ID,
  isValidCityId,
  type CityId,
  type CityConfig,
} from '@/lib/city-config'

// ==================== 常量 ====================

const STORAGE_KEY = 'selected-city'
const FIRST_VISIT_KEY = 'city-first-visit'

// ==================== 类型 ====================

interface UseCitySelectionReturn {
  /** 当前选中的城市 ID */
  cityId: CityId
  /** 当前选中的城市配置 */
  city: CityConfig
  /** 所有可用城市 */
  cities: CityConfig[]
  /** 切换城市 */
  setCity: (id: CityId) => void
  /** 是否正在加载（首次智能选择中） */
  isLoading: boolean
  /** 是否首次访问（用于显示切换提示） */
  isFirstVisit: boolean
  /** 标记首次访问提示已显示 */
  dismissFirstVisitHint: () => void
}

// ==================== Hook ====================

/**
 * 城市选择 Hook
 *
 * 功能：
 * 1. 首次访问时通过 IP 定位智能选择城市
 * 2. 用户选择后存入 localStorage 持久化
 * 3. 提供首次访问标记，用于显示切换提示
 *
 * @example
 * ```tsx
 * const { cityId, city, setCity, isFirstVisit } = useCitySelection()
 * ```
 */
export function useCitySelection(): UseCitySelectionReturn {
  const [cityId, setCityId] = useState<CityId>(DEFAULT_CITY_ID)
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  // 初始化：读取 localStorage 或智能检测
  useEffect(() => {
    async function init() {
      // 1. 检查 localStorage
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && isValidCityId(stored)) {
        setCityId(stored)
        setIsLoading(false)
        return
      }

      // 2. 首次访问，标记并进行智能检测
      const visited = localStorage.getItem(FIRST_VISIT_KEY)
      if (!visited) {
        setIsFirstVisit(true)
        localStorage.setItem(FIRST_VISIT_KEY, 'true')
      }

      // 3. 调用 IP 定位 API
      try {
        const response = await fetch('/api/geo')
        if (response.ok) {
          const data = await response.json()
          if (data.cityId && isValidCityId(data.cityId)) {
            setCityId(data.cityId)
            // 智能检测到的城市也存入 localStorage
            localStorage.setItem(STORAGE_KEY, data.cityId)
          }
        }
      } catch (error) {
        console.warn('[useCitySelection] IP detection failed:', error)
        // 失败时使用默认值，已在 state 初始化
      }

      setIsLoading(false)
    }

    init()
  }, [])

  // 切换城市
  const setCity = useCallback((id: CityId) => {
    setCityId(id)
    localStorage.setItem(STORAGE_KEY, id)
    // 切换后清除首次访问提示
    setIsFirstVisit(false)
  }, [])

  // 关闭首次访问提示
  const dismissFirstVisitHint = useCallback(() => {
    setIsFirstVisit(false)
  }, [])

  // 获取当前城市配置
  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0]

  return {
    cityId,
    city,
    cities: CITIES,
    setCity,
    isLoading,
    isFirstVisit,
    dismissFirstVisitHint,
  }
}
