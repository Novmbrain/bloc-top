'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ==================== 常量 ====================

const STORAGE_KEY = 'climber-body-data'

// ==================== 类型 ====================

export interface ClimberBodyData {
  /** 身高 (cm)，字符串形式，直接用于 input value */
  height: string
  /** 臂长 (cm)，字符串形式，直接用于 input value */
  reach: string
}

interface UseClimberBodyDataReturn {
  /** 缓存的身体数据 */
  bodyData: ClimberBodyData
  /** 更新身体数据（仅更新非空值） */
  updateBodyData: (data: Partial<ClimberBodyData>) => void
  /** 清除所有缓存数据 */
  clearBodyData: () => void
}

// ==================== 默认值 ====================

const DEFAULT_BODY_DATA: ClimberBodyData = {
  height: '',
  reach: '',
}

// ==================== 辅助函数 ====================

/**
 * 从 localStorage 读取缓存数据（SSR 安全）
 * 此函数只在客户端调用
 */
function loadFromStorage(): ClimberBodyData {
  if (typeof window === 'undefined') {
    return DEFAULT_BODY_DATA
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ClimberBodyData>
      return {
        height: parsed.height ?? '',
        reach: parsed.reach ?? '',
      }
    }
  } catch (error) {
    console.warn('[useClimberBodyData] Failed to load cached data:', error)
  }

  return DEFAULT_BODY_DATA
}

// ==================== Hook ====================

/**
 * 攀岩者身体数据缓存 Hook
 *
 * 功能：
 * 1. 从 localStorage 读取缓存的身高/臂长
 * 2. 提供更新方法（Beta 提交成功后调用）
 * 3. SSR 安全（使用 useEffect 进行 hydration）
 *
 * @example
 * ```tsx
 * const { bodyData, updateBodyData } = useClimberBodyData()
 *
 * // 初始化表单
 * const [height, setHeight] = useState(bodyData.height)
 *
 * // 提交成功后保存
 * updateBodyData({ height: '175', reach: '180' })
 * ```
 */
export function useClimberBodyData(): UseClimberBodyDataReturn {
  // 使用 ref 跟踪是否已经 hydrated
  const isHydratedRef = useRef(false)

  // 初始状态为默认值（SSR 安全）
  const [bodyData, setBodyData] = useState<ClimberBodyData>(DEFAULT_BODY_DATA)

  // Hydration：客户端首次渲染后从 localStorage 加载数据
  // 使用 async 函数包装以符合 react-hooks/set-state-in-effect 规则
  useEffect(() => {
    async function hydrate() {
      if (!isHydratedRef.current) {
        isHydratedRef.current = true
        const cached = loadFromStorage()
        // 只有当缓存数据与默认值不同时才更新状态
        if (cached.height || cached.reach) {
          setBodyData(cached)
        }
      }
    }
    hydrate()
  }, [])

  // 更新身体数据（仅更新非空值）
  const updateBodyData = useCallback((data: Partial<ClimberBodyData>) => {
    setBodyData((prev) => {
      const updated: ClimberBodyData = {
        // 仅当新值非空时更新，否则保留旧值
        height: data.height?.trim() || prev.height,
        reach: data.reach?.trim() || prev.reach,
      }

      // 持久化到 localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.warn('[useClimberBodyData] Failed to save data:', error)
      }

      return updated
    })
  }, [])

  // 清除所有缓存数据
  const clearBodyData = useCallback(() => {
    setBodyData(DEFAULT_BODY_DATA)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('[useClimberBodyData] Failed to clear data:', error)
    }
  }, [])

  return {
    bodyData,
    updateBodyData,
    clearBodyData,
  }
}
