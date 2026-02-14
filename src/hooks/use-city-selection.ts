'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  DEFAULT_CITY_ID,
  CITY_COOKIE_NAME,
  CITY_COOKIE_MAX_AGE,
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

/** 同步写入 cookie，供服务端 Server Component 读取 */
function setCityCookie(value: string) {
  document.cookie = `${CITY_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${CITY_COOKIE_MAX_AGE}; samesite=lax`
}

// ==================== 类型 ====================

interface UseCitySelectionOptions {
  cities: CityConfig[]
  prefectures: PrefectureConfig[]
  serverSelection: CitySelection
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
}

// ==================== Hook ====================

/**
 * 城市选择 Hook
 *
 * 简化版：由 middleware IP 检测 + page.tsx 服务端解析完成初始选择，
 * 客户端仅负责用户手动切换时更新状态和 cookie。
 */
export function useCitySelection({
  cities,
  prefectures,
  serverSelection,
}: UseCitySelectionOptions): UseCitySelectionReturn {
  const [selection, setSelectionState] = useState<CitySelection>(serverSelection)

  // 切换选择
  const setSelection = useCallback((sel: CitySelection) => {
    setSelectionState(sel)
    setCityCookie(serializeCitySelection(sel))
  }, [])

  // 兼容方法：切换单个城市
  const setCity = useCallback((id: string) => {
    setSelection({ type: 'city', id })
  }, [setSelection])

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
  }
}
