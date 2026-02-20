import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import type { Route, TopoPoint } from '@bloctop/shared/types'
import { catmullRomCurve, scalePoints } from '@bloctop/shared/topo-utils'
import { getGradeColor } from '@bloctop/shared/tokens'
import { computeViewBox } from '@bloctop/shared/topo-constants'
import { useToast } from '@bloctop/ui/components/toast'
import { validateRouteForm } from '@/lib/route-validation'
import type { FaceImageCacheService } from '@bloctop/ui/face-image'

export interface UseRouteEditorOptions {
  selectedRoute: Route | null
  faceImageCache: FaceImageCacheService
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>
  persistedAreas: string[]
  selectedCragId: string | null
  updateCragAreas: (cragId: string, areas: string[]) => Promise<string[]>
}

export function useRouteEditor({
  selectedRoute,
  faceImageCache,
  setRoutes,
  persistedAreas,
  selectedCragId,
  updateCragAreas,
}: UseRouteEditorOptions) {
  const { showToast } = useToast()

  // Edit state
  const [editedRoute, setEditedRoute] = useState<Partial<Route>>({})
  const [topoLine, setTopoLine] = useState<TopoPoint[]>([])
  const [topoTension, setTopoTension] = useState(0)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Image state
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [imageAspectRatio, setImageAspectRatio] = useState<number | undefined>(undefined)

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fullscreen topo state
  const [isFullscreenEdit, setIsFullscreenEdit] = useState(false)
  const [showOtherRoutes, setShowOtherRoutes] = useState(true)

  const justSavedRef = useRef(false)
  const topoSnapshotRef = useRef<{ line: TopoPoint[]; tension: number } | null>(null)

  // Dirty check
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!selectedRoute) return false
    if ((selectedFaceId ?? null) !== (selectedRoute.faceId ?? null)) return true
    const fields = ['name', 'grade', 'area', 'FA', 'setter', 'description'] as const
    for (const field of fields) {
      if ((editedRoute[field] ?? '') !== (selectedRoute[field] ?? '')) return true
    }
    const original = selectedRoute.topoLine || []
    if (topoLine.length !== original.length) return true
    for (let i = 0; i < topoLine.length; i++) {
      if (topoLine[i].x !== original[i].x || topoLine[i].y !== original[i].y) return true
    }
    if (topoTension !== (selectedRoute.topoTension ?? 0)) return true
    return false
  }, [selectedRoute, editedRoute, topoLine, topoTension, selectedFaceId])

  // Initialize edit state when route is selected
  useEffect(() => {
    if (!selectedRoute) return

    setEditedRoute({
      name: selectedRoute.name,
      grade: selectedRoute.grade,
      area: selectedRoute.area,
      setter: selectedRoute.setter,
      FA: selectedRoute.FA,
      description: selectedRoute.description,
    })
    setTopoLine(selectedRoute.topoLine || [])
    setTopoTension(selectedRoute.topoTension ?? 0)
    setFormErrors({})

    if (justSavedRef.current) {
      justSavedRef.current = false
      return
    }

    const autoFaceId = selectedRoute.faceId || null
    setSelectedFaceId(autoFaceId)

    if (autoFaceId && selectedRoute.area) {
      const url = faceImageCache.getImageUrl({ cragId: selectedRoute.cragId, area: selectedRoute.area, faceId: autoFaceId })
      setImageUrl(prev => {
        if (prev === url) return prev
        setIsImageLoading(true)
        setImageAspectRatio(undefined)
        return url
      })
      setImageLoadError(false)
    } else {
      setImageUrl(null)
      setImageLoadError(false)
    }
  }, [selectedRoute, faceImageCache])

  // Canvas operations
  const handleRemoveLastPoint = useCallback(() => {
    setTopoLine((prev) => prev.slice(0, -1))
  }, [])

  const handleClearPoints = useCallback(() => {
    setTopoLine([])
    setTopoTension(0)
  }, [])

  // Fullscreen topo
  const handleOpenFullscreen = useCallback(() => {
    topoSnapshotRef.current = { line: [...topoLine], tension: topoTension }
    setIsFullscreenEdit(true)
  }, [topoLine, topoTension])

  const handleFullscreenClose = useCallback((confirmed: boolean) => {
    if (!confirmed && topoSnapshotRef.current) {
      setTopoLine(topoSnapshotRef.current.line)
      setTopoTension(topoSnapshotRef.current.tension)
    }
    topoSnapshotRef.current = null
    setIsFullscreenEdit(false)
  }, [])

  // Save
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!selectedRoute) return false

    const errors = validateRouteForm({ name: editedRoute.name || '', area: editedRoute.area || '' })
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return false
    }
    setFormErrors({})

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const response = await fetch(`/api/routes/${selectedRoute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editedRoute,
          faceId: selectedFaceId,
          topoLine: topoLine.length >= 2 ? topoLine : null,
          topoTension: topoLine.length >= 2 && topoTension > 0 ? topoTension : null,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '保存失败')

      setSaveSuccess(true)
      justSavedRef.current = true

      setRoutes((prev) => prev.map((r) => (r.id === selectedRoute.id ? data.route : r)))

      const savedArea = editedRoute.area?.trim()
      if (savedArea && selectedCragId && !persistedAreas.includes(savedArea)) {
        const merged = [...new Set([...persistedAreas, savedArea])].sort()
        updateCragAreas(selectedCragId, merged).catch(() => {})
      }

      showToast('线路信息保存成功！', 'success', 3000)
      setTimeout(() => setSaveSuccess(false), 2000)
      return true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '保存失败'
      setSaveError(errorMsg)
      showToast(errorMsg, 'error', 4000)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [selectedRoute, editedRoute, topoLine, topoTension, selectedFaceId, setRoutes, showToast, persistedAreas, selectedCragId, updateCragAreas])

  // Delete
  const handleDeleteRoute = useCallback(async () => {
    if (!selectedRoute || isDeleting) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/routes/${selectedRoute.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '删除失败')

      setRoutes(prev => prev.filter(r => r.id !== selectedRoute.id))
      setShowDeleteConfirm(false)
      showToast('线路已删除', 'success', 3000)
      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : '删除失败'
      showToast(msg, 'error', 4000)
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [selectedRoute, isDeleting, setRoutes, showToast])

  // Face selection — 纯 UI 状态更新，不立即 PATCH，等用户点 Save 时统一提交
  const handleFaceSelect = useCallback((faceId: string, area: string) => {
    if (!selectedRoute || faceId === selectedFaceId) return
    setSelectedFaceId(faceId)
    const url = faceImageCache.getImageUrl({ cragId: selectedRoute.cragId, area, faceId })
    setImageUrl(url)
    setIsImageLoading(true)
    setImageLoadError(false)
    setImageAspectRatio(undefined)
  }, [selectedRoute, selectedFaceId, faceImageCache])

  // Image event handlers
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsImageLoading(false)
    setImageLoadError(false)
    const img = e.currentTarget
    if (img.naturalWidth && img.naturalHeight) {
      setImageAspectRatio(img.naturalWidth / img.naturalHeight)
    }
  }, [])

  const handleImageError = useCallback(() => {
    setIsImageLoading(false)
    setImageLoadError(true)
  }, [])

  // SVG computations
  const routeColor = useMemo(
    () => getGradeColor(editedRoute.grade || selectedRoute?.grade || '？'),
    [editedRoute.grade, selectedRoute?.grade]
  )

  const vb = useMemo(() => computeViewBox(imageAspectRatio ?? 4 / 3), [imageAspectRatio])

  const scaledPoints = useMemo(
    () => scalePoints(topoLine, vb.width, vb.height),
    [topoLine, vb]
  )

  const pathData = useMemo(() => {
    if (scaledPoints.length < 2) return ''
    return catmullRomCurve(scaledPoints, 0.5, topoTension)
  }, [scaledPoints, topoTension])

  // Reset on deselect
  const resetEditor = useCallback(() => {
    setSelectedFaceId(null)
    setImageUrl(null)
    setImageLoadError(false)
    setIsImageLoading(false)
  }, [])

  return {
    // Edit state
    editedRoute,
    setEditedRoute,
    topoLine,
    setTopoLine,
    topoTension,
    setTopoTension,
    formErrors,
    setFormErrors,

    // Image state
    selectedFaceId,
    imageUrl,
    isImageLoading,
    imageLoadError,
    imageAspectRatio,

    // Save state
    isSaving,
    saveError,
    saveSuccess,

    // Delete state
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,

    // Fullscreen
    isFullscreenEdit,
    showOtherRoutes,
    setShowOtherRoutes,

    // SVG
    routeColor,
    vb,
    scaledPoints,
    pathData,

    // Actions
    hasUnsavedChanges,
    handleSave,
    handleDeleteRoute,
    handleFaceSelect,
    handleImageLoad,
    handleImageError,
    handleRemoveLastPoint,
    handleClearPoints,
    handleOpenFullscreen,
    handleFullscreenClose,
    resetEditor,
  }
}
