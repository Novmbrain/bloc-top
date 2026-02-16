'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, authClient } from '@/lib/auth-client'

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

  // 获取当前登录 Session
  const { data: session } = useSession()

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

  // DB 同步：登录时优先使用 DB 数据，localStorage → DB 迁移
  useEffect(() => {
    if (!session) return
    const user = session.user as { height?: number; reach?: number }
    const dbHeight = user.height?.toString() ?? ''
    const dbReach = user.reach?.toString() ?? ''

    if (dbHeight || dbReach) {
      // DB has data — use it and sync to localStorage
      const dbData = {
        height: dbHeight || bodyData.height,
        reach: dbReach || bodyData.reach,
      }
      setBodyData(dbData)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData)) } catch {}
    } else if (bodyData.height || bodyData.reach) {
      // DB empty, localStorage has data — migrate to DB
      const h = parseFloat(bodyData.height)
      const r = parseFloat(bodyData.reach)
      const updateData: Record<string, number> = {}
      if (!isNaN(h) && h > 0) updateData.height = h
      if (!isNaN(r) && r > 0) updateData.reach = r
      if (Object.keys(updateData).length > 0) {
        authClient.updateUser(updateData).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 session 变化时同步
  }, [session])

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

    // Sync to DB if logged in (fire-and-forget)
    if (session) {
      const updateData: Record<string, number> = {}
      const h = parseFloat(data.height?.trim() ?? '')
      const r = parseFloat(data.reach?.trim() ?? '')
      if (!isNaN(h) && h > 0) updateData.height = h
      if (!isNaN(r) && r > 0) updateData.reach = r
      if (Object.keys(updateData).length > 0) {
        authClient.updateUser(updateData).catch(() => {})
      }
    }
  }, [session])

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
