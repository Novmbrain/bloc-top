'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_CITY_ID, CITY_COOKIE_NAME, isCityValid } from '@/lib/city-utils'
import type { CityConfig } from '@/types'

// ==================== 常量 ====================

const STORAGE_KEY = 'selected-city'
const FIRST_VISIT_KEY = 'city-first-visit'
const SESSION_VISIT_KEY = 'session-visit-recorded' // sessionStorage: 单会话去重

/** 同步写入 cookie，供服务端 Server Component 读取 */
function setCityCookie(id: string) {
  document.cookie = `${CITY_COOKIE_NAME}=${id}; path=/; max-age=31536000; samesite=lax`
}

// ==================== 类型 ====================

interface UseCitySelectionOptions {
  cities: CityConfig[]
}

interface UseCitySelectionReturn {
  /** 当前选中的城市 ID */
  cityId: string
  /** 当前选中的城市配置 */
  city: CityConfig
  /** 所有可用城市 */
  cities: CityConfig[]
  /** 切换城市 */
  setCity: (id: string) => void
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
 * @param options.cities 城市列表（从服务端 props 传入）
 */
export function useCitySelection({ cities }: UseCitySelectionOptions): UseCitySelectionReturn {
  const [cityId, setCityId] = useState<string>(DEFAULT_CITY_ID)
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  // 初始化：读取 localStorage 或智能检测
  useEffect(() => {
    async function init() {
      const storedCity = localStorage.getItem(STORAGE_KEY)
      const visited = localStorage.getItem(FIRST_VISIT_KEY)
      const sessionVisited = sessionStorage.getItem(SESSION_VISIT_KEY)

      // 优化：老用户 + 本会话已记录 → 跳过 geo API 调用
      const hasValidCachedCity = storedCity && isCityValid(cities, storedCity)
      const needGeoApi = !sessionVisited || !hasValidCachedCity

      let geoData: { cityId?: string; province?: string } | null = null

      if (needGeoApi) {
        try {
          const response = await fetch('/api/geo')
          if (response.ok) {
            geoData = await response.json()
          }
        } catch (error) {
          console.warn('[useCitySelection] IP detection failed:', error)
        }
      }

      // 记录访问（单会话只记录一次）
      if (!sessionVisited) {
        recordVisit(geoData?.province)
        sessionStorage.setItem(SESSION_VISIT_KEY, 'true')
      }

      // 处理首次访问标记
      if (!visited) {
        setIsFirstVisit(true)
        localStorage.setItem(FIRST_VISIT_KEY, 'true')
      }

      // 处理城市选择
      if (hasValidCachedCity) {
        setCityId(storedCity)
        setCityCookie(storedCity)
      } else if (geoData?.cityId && isCityValid(cities, geoData.cityId)) {
        setCityId(geoData.cityId)
        localStorage.setItem(STORAGE_KEY, geoData.cityId)
        setCityCookie(geoData.cityId)
      }

      setIsLoading(false)
    }

    init()
  }, [cities])

  // 切换城市
  const setCity = useCallback((id: string) => {
    setCityId(id)
    localStorage.setItem(STORAGE_KEY, id)
    setCityCookie(id)
    setIsFirstVisit(false)
  }, [])

  // 关闭首次访问提示
  const dismissFirstVisitHint = useCallback(() => {
    setIsFirstVisit(false)
  }, [])

  // 获取当前城市配置
  const city = cities.find((c) => c.id === cityId) ?? cities[0]

  return {
    cityId,
    city,
    cities,
    setCity,
    isLoading,
    isFirstVisit,
    dismissFirstVisitHint,
  }
}

// ==================== 辅助函数 ====================

function recordVisit(province?: string): void {
  fetch('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ province }),
  }).catch(() => {
    // 静默失败，不影响主流程
  })
}
