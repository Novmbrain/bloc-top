'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Crag, Route } from '@/types'

interface FaceInfo {
  faceId: string
  area: string
}

interface UseCragRoutesOptions {
  /** 是否同时加载 R2 岩面数据 */
  includeFaces?: boolean
}

/**
 * 共用 hook：加载岩场列表 + 线路列表
 * 可选并行加载 R2 faces 数据
 */
export function useCragRoutes(options?: UseCragRoutesOptions) {
  const includeFaces = options?.includeFaces ?? false

  const [crags, setCrags] = useState<Crag[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedCragId, setSelectedCragId] = useState<string | null>(null)
  const [isLoadingCrags, setIsLoadingCrags] = useState(true)
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false)
  const [r2Faces, setR2Faces] = useState<FaceInfo[]>([])
  const [isLoadingFaces, setIsLoadingFaces] = useState(false)

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

  // 加载岩场线路（可选并行加载 faces）
  useEffect(() => {
    if (!selectedCragId) {
      setRoutes([])
      if (includeFaces) setR2Faces([])
      return
    }

    setRoutes([])
    if (includeFaces) setR2Faces([])

    let cancelled = false

    async function loadData() {
      setIsLoadingRoutes(true)
      if (includeFaces) setIsLoadingFaces(true)

      const promises: Promise<void>[] = [
        fetch(`/api/crags/${selectedCragId}/routes`)
          .then(res => res.json())
          .then(data => { if (!cancelled) setRoutes(data.routes || []) })
          .catch(err => console.error('Failed to load routes:', err))
          .finally(() => { if (!cancelled) setIsLoadingRoutes(false) }),
      ]

      if (includeFaces) {
        promises.push(
          fetch(`/api/faces?cragId=${encodeURIComponent(selectedCragId!)}`)
            .then(res => res.json())
            .then(data => { if (!cancelled && data.success) setR2Faces(data.faces || []) })
            .catch(() => { /* silent fallback */ })
            .finally(() => { if (!cancelled) setIsLoadingFaces(false) })
        )
      }

      await Promise.all(promises)
    }

    loadData()
    return () => { cancelled = true }
  }, [selectedCragId, includeFaces])

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
    ...(includeFaces ? { r2Faces, setR2Faces, isLoadingFaces } : {}),
  }
}
