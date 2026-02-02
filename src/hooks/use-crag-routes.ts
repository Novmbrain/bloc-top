'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Crag, Route } from '@/types'

/**
 * 共用 hook：加载岩场列表 + 线路列表
 */
export function useCragRoutes() {
  const [crags, setCrags] = useState<Crag[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedCragId, setSelectedCragId] = useState<string | null>(null)
  const [isLoadingCrags, setIsLoadingCrags] = useState(true)
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false)

  // 加载岩场列表
  useEffect(() => {
    async function loadCrags() {
      try {
        const response = await fetch('/api/crags')
        if (response.ok) {
          const data = await response.json()
          setCrags(data.crags || [])
          if (data.crags?.length > 0) {
            setSelectedCragId(data.crags[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to load crags:', error)
      } finally {
        setIsLoadingCrags(false)
      }
    }
    loadCrags()
  }, [])

  // 加载岩场线路
  useEffect(() => {
    if (!selectedCragId) {
      setRoutes([])
      return
    }

    async function loadRoutes() {
      setIsLoadingRoutes(true)
      try {
        const response = await fetch(`/api/crags/${selectedCragId}/routes`)
        if (response.ok) {
          const data = await response.json()
          setRoutes(data.routes || [])
        }
      } catch (error) {
        console.error('Failed to load routes:', error)
      } finally {
        setIsLoadingRoutes(false)
      }
    }
    loadRoutes()
  }, [selectedCragId])

  // 统计数据
  const stats = useMemo(() => {
    const marked = routes.filter((r) => r.topoLine && r.topoLine.length >= 2)
    return {
      total: routes.length,
      marked: marked.length,
      unmarked: routes.length - marked.length,
      progress: routes.length > 0 ? (marked.length / routes.length) * 100 : 0,
    }
  }, [routes])

  // 更新指定岩场的 areas 并同步本地状态
  const updateCragAreas = useCallback(async (cragId: string, areas: string[]) => {
    const res = await fetch(`/api/crags/${cragId}/areas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areas }),
    })
    if (!res.ok) throw new Error('更新区域失败')
    const data = await res.json()
    const savedAreas: string[] = data.areas
    setCrags(prev => prev.map(c => c.id === cragId ? { ...c, areas: savedAreas } : c))
    return savedAreas
  }, [])

  return {
    crags,
    routes,
    setRoutes,
    selectedCragId,
    setSelectedCragId,
    isLoadingCrags,
    isLoadingRoutes,
    stats,
    updateCragAreas,
  }
}
