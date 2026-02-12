'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  DEFAULT_CITY_ID,
  CITY_COOKIE_NAME,
  isCityValid,
  parseCitySelection,
  serializeCitySelection,
} from '@/lib/city-utils'
import type { CityConfig, CitySelection, PrefectureConfig } from '@/types'

// ==================== 常量 ====================

/** 防御性回退：DB 无数据时使用硬编码默认城市，避免 undefined 崩溃 */
const FALLBACK_CITY: CityConfig = {
  id: DEFAULT_CITY_ID,
  name: '罗源',
  shortName: '罗源',
  adcode: '350123',
  coordinates: { lng: 119.549, lat: 26.489 },
  available: true,
}

const STORAGE_KEY = 'selected-city'
const FIRST_VISIT_KEY = 'city-first-visit'
const SESSION_VISIT_KEY = 'session-visit-recorded' // sessionStorage: 单会话去重

/** 同步写入 cookie，供服务端 Server Component 读取 */
function setCityCookie(value: string) {
  document.cookie = `${CITY_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
}

// ==================== 类型 ====================

interface UseCitySelectionOptions {
  cities: CityConfig[]
  prefectures: PrefectureConfig[]
}

interface UseCitySelectionReturn {
  /** 当前选择状态（城市或地级市） */
  selection: CitySelection
  /** 兼容字段：当前有效的城市 ID（地级市模式下取 defaultDistrict） */
  cityId: string
  /** 兼容字段：当前有效的城市配置 */
  city: CityConfig
  /** 所有可用城市 */
  cities: CityConfig[]
  /** 切换选择（支持城市和地级市） */
  setSelection: (sel: CitySelection) => void
  /** 兼容方法：切换城市（包装为 { type: 'city', id }） */
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
 * 1. 支持区/县级和地级市级两种选择粒度
 * 2. 首次访问时通过 IP 定位智能选择城市
 * 3. 用户选择后存入 localStorage 持久化（JSON 格式，兼容旧纯字符串）
 * 4. 提供首次访问标记，用于显示切换提示
 */
export function useCitySelection({ cities, prefectures }: UseCitySelectionOptions): UseCitySelectionReturn {
  const [selection, setSelectionState] = useState<CitySelection>({ type: 'city', id: DEFAULT_CITY_ID })
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  // 初始化：读取 localStorage 或智能检测
  useEffect(() => {
    async function init() {
      const storedRaw = localStorage.getItem(STORAGE_KEY)
      const visited = localStorage.getItem(FIRST_VISIT_KEY)
      const sessionVisited = sessionStorage.getItem(SESSION_VISIT_KEY)

      // 解析存储值（自动兼容旧格式纯字符串）
      const storedSelection = parseCitySelection(storedRaw ?? undefined)

      // 验证缓存的选择是否有效
      const hasValidCached = storedRaw && isSelectionValid(storedSelection, cities, prefectures)

      const needGeoApi = !sessionVisited || !hasValidCached

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

      // 处理选择
      if (hasValidCached) {
        setSelectionState(storedSelection)
        setCityCookie(serializeCitySelection(storedSelection))
      } else if (geoData?.cityId && isCityValid(cities, geoData.cityId)) {
        const geoSelection: CitySelection = { type: 'city', id: geoData.cityId }
        setSelectionState(geoSelection)
        localStorage.setItem(STORAGE_KEY, serializeCitySelection(geoSelection))
        setCityCookie(serializeCitySelection(geoSelection))
      }

      setIsLoading(false)
    }

    init()
  }, [cities, prefectures])

  // 切换选择
  const setSelection = useCallback((sel: CitySelection) => {
    setSelectionState(sel)
    const serialized = serializeCitySelection(sel)
    localStorage.setItem(STORAGE_KEY, serialized)
    setCityCookie(serialized)
    setIsFirstVisit(false)
  }, [])

  // 兼容方法：切换单个城市
  const setCity = useCallback((id: string) => {
    setSelection({ type: 'city', id })
  }, [setSelection])

  // 关闭首次访问提示
  const dismissFirstVisitHint = useCallback(() => {
    setIsFirstVisit(false)
  }, [])

  // 计算兼容 cityId：地级市模式下取 defaultDistrict
  const cityId = useMemo(() => {
    if (selection.type === 'city') return selection.id
    const pref = prefectures.find((p) => p.id === selection.id)
    return pref?.defaultDistrict ?? DEFAULT_CITY_ID
  }, [selection, prefectures])

  // 获取当前城市配置（防御空数组）
  const city = cities.find((c) => c.id === cityId) ?? cities[0] ?? FALLBACK_CITY

  return {
    selection,
    cityId,
    city,
    cities,
    setSelection,
    setCity,
    isLoading,
    isFirstVisit,
    dismissFirstVisitHint,
  }
}

// ==================== 辅助函数 ====================

/** 验证选择是否有效 */
function isSelectionValid(
  sel: CitySelection,
  cities: CityConfig[],
  prefectures: PrefectureConfig[],
): boolean {
  if (sel.type === 'city') return isCityValid(cities, sel.id)
  return prefectures.some((p) => p.id === sel.id)
}

function recordVisit(province?: string): void {
  fetch('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ province }),
  }).catch(() => {
    // 静默失败，不影响主流程
  })
}
