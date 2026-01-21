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
      const storedCity = localStorage.getItem(STORAGE_KEY)
      const visited = localStorage.getItem(FIRST_VISIT_KEY)

      // 1. 调用 geo API（用于访问记录和城市检测）
      let geoData: { cityId?: string; province?: string } | null = null
      try {
        const response = await fetch('/api/geo')
        if (response.ok) {
          geoData = await response.json()
        }
      } catch (error) {
        console.warn('[useCitySelection] IP detection failed:', error)
      }

      // 2. 记录访问（每次打开都记录，不去重）
      //    有省份则记录省份，无省份（海外/失败）记录为「海外」
      recordVisit(geoData?.province)

      // 3. 处理首次访问标记（用于显示切换提示）
      if (!visited) {
        setIsFirstVisit(true)
        localStorage.setItem(FIRST_VISIT_KEY, 'true')
      }

      // 4. 处理城市选择
      if (storedCity && isValidCityId(storedCity)) {
        // 已有存储的城市，直接使用
        setCityId(storedCity)
      } else if (geoData?.cityId && isValidCityId(geoData.cityId)) {
        // 使用 geo API 检测到的城市
        setCityId(geoData.cityId)
        localStorage.setItem(STORAGE_KEY, geoData.cityId)
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

// ==================== 辅助函数 ====================

/**
 * 记录用户访问（静默失败，不阻塞主流程）
 * 每次打开 App 都会调用，不去重
 *
 * @param province 省份名称，海外用户传 undefined
 */
function recordVisit(province?: string): void {
  fetch('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ province }),
  }).catch(() => {
    // 静默失败，不影响主流程
  })
}
