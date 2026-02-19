// apps/editor/src/hooks/use-face-data.ts
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useToast } from '@bloctop/ui/components/toast'
import type { Route } from '@bloctop/shared/types'
import type { FaceImageCacheService } from '@bloctop/ui/face-image'
import { preloadImage } from '@bloctop/shared/editor-utils'

const FACE_ID_PATTERN = /^[\u4e00-\u9fffa-z0-9-]+$/

export interface R2FaceInfo { faceId: string; area: string }

export interface FaceGroup {
  faceId: string
  area: string
  routes: Route[]
  imageUrl: string
}

export interface UseFaceDataOptions {
  selectedCragId: string | null
  routes: Route[]
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>
  selectedArea: string | null
  persistedAreas: string[]
  updateCragAreas: (cragId: string, areas: string[]) => Promise<string[]>
  faceImageCache: FaceImageCacheService
}

export function useFaceData({
  selectedCragId,
  routes,
  setRoutes,
  selectedArea,
  persistedAreas,
  updateCragAreas,
  faceImageCache,
}: UseFaceDataOptions) {
  const { showToast } = useToast()
  const [r2Faces, setR2Faces] = useState<R2FaceInfo[]>([])
  const [isLoadingFaces, setIsLoadingFaces] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadFaces = useCallback((cragId: string, signal?: AbortSignal) => {
    setIsLoadingFaces(true)
    return fetch(`/api/faces?cragId=${encodeURIComponent(cragId)}`, { signal })
      .then(res => res.json())
      .then(data => {
        if (data.success) setR2Faces(data.faces as R2FaceInfo[])
        setIsLoadingFaces(false)
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setIsLoadingFaces(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedCragId) { setR2Faces([]); return }
    setR2Faces([])
    const controller = new AbortController()
    loadFaces(selectedCragId, controller.signal)
    return () => controller.abort()
  }, [selectedCragId, loadFaces])

  const handleRefresh = useCallback(async () => {
    if (!selectedCragId || isRefreshing) return
    setIsRefreshing(true)
    await loadFaces(selectedCragId)
    setIsRefreshing(false)
    showToast('已刷新', 'success', 2000)
  }, [selectedCragId, isRefreshing, loadFaces, showToast])

  const faceGroups = useMemo(() => {
    if (!selectedCragId) return []
    const map = new Map<string, FaceGroup>()
    r2Faces.forEach(({ faceId, area }) => {
      map.set(faceId, {
        faceId, area, routes: [],
        imageUrl: faceImageCache.getImageUrl({ cragId: selectedCragId, area, faceId }),
      })
    })
    routes.forEach(r => {
      if (!r.faceId) return
      const entry = map.get(r.faceId)
      if (entry) entry.routes.push(r)
    })
    let result = Array.from(map.values())
    if (selectedArea) result = result.filter(f => f.area === selectedArea)
    return result
  }, [routes, r2Faces, selectedCragId, selectedArea, faceImageCache])

  const handleDeleteFace = useCallback(async (selectedFace: FaceGroup) => {
    if (!selectedCragId) return false
    try {
      const res = await fetch('/api/faces', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cragId: selectedCragId, area: selectedFace.area, faceId: selectedFace.faceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '删除失败')

      faceImageCache.invalidate(`${selectedCragId}/${selectedFace.area}/${selectedFace.faceId}`)
      setR2Faces(prev => prev.filter(f => f.faceId !== selectedFace.faceId))

      const msg = data.routesCleared > 0
        ? `岩面已删除，已清除 ${data.routesCleared} 条线路的关联`
        : '岩面已删除'
      showToast(msg, 'success', 3000)
      return true
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error', 4000)
      return false
    }
  }, [selectedCragId, showToast, faceImageCache])

  const handleRenameFace = useCallback(async (selectedFace: FaceGroup, newFaceId: string) => {
    if (!selectedCragId) return false
    const trimmed = newFaceId.trim()
    if (!trimmed || trimmed === selectedFace.faceId) return false
    if (!FACE_ID_PATTERN.test(trimmed)) {
      showToast('名称只允许中文、小写字母、数字和连字符', 'error')
      return false
    }
    try {
      const res = await fetch('/api/faces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cragId: selectedCragId,
          area: selectedFace.area,
          oldFaceId: selectedFace.faceId,
          newFaceId: trimmed,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '重命名失败')

      faceImageCache.invalidate(`${selectedCragId}/${selectedFace.area}/${selectedFace.faceId}`)
      faceImageCache.invalidate(`${selectedCragId}/${selectedFace.area}/${trimmed}`)
      setR2Faces(prev => prev.map(f => f.faceId === selectedFace.faceId ? { ...f, faceId: trimmed } : f))
      setRoutes(prev => prev.map(r => r.faceId === selectedFace.faceId ? { ...r, faceId: trimmed } : r))

      const msg = data.routesUpdated > 0 ? `已重命名，${data.routesUpdated} 条线路已更新` : '岩面已重命名'
      showToast(msg, 'success', 3000)
      return trimmed
    } catch (error) {
      showToast(error instanceof Error ? error.message : '重命名失败', 'error', 4000)
      return false
    }
  }, [selectedCragId, showToast, faceImageCache, setRoutes])

  const handleUploadSuccess = useCallback(async (params: {
    url: string
    faceId: string
    area: string
    isCreating: boolean
    newArea: string
  }) => {
    const { url, faceId, area, isCreating, newArea } = params
    await preloadImage(url)
    faceImageCache.invalidate(`${selectedCragId}/${area}/${faceId}`)
    showToast('照片上传成功！', 'success', 3000)

    if (isCreating) {
      if (newArea && selectedCragId && !persistedAreas.includes(newArea)) {
        const merged = [...new Set([...persistedAreas, newArea])].sort()
        updateCragAreas(selectedCragId, merged).catch(() => {})
      }
      setR2Faces(prev => prev.some(f => f.faceId === faceId) ? prev : [...prev, { faceId, area }])
    }
  }, [selectedCragId, faceImageCache, showToast, persistedAreas, updateCragAreas])

  return {
    r2Faces,
    setR2Faces,
    isLoadingFaces,
    isRefreshing,
    faceGroups,
    handleRefresh,
    handleDeleteFace,
    handleRenameFace,
    handleUploadSuccess,
  }
}
