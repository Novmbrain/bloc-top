import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import type { Route, TopoPoint, RouteTopoAnnotation } from '@bloctop/shared/types'
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

/** 从路由数据初始化 annotations（兼容旧字段） */
function buildInitialAnnotations(route: Route): RouteTopoAnnotation[] {
  if (route.topoAnnotations && route.topoAnnotations.length > 0) {
    return route.topoAnnotations
  }
  if (route.faceId && route.area && route.topoLine && route.topoLine.length >= 2) {
    return [{
      faceId: route.faceId,
      area: route.area,
      topoLine: route.topoLine,
      topoTension: route.topoTension,
    }]
  }
  return []
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Multi-annotation state（替代旧的 topoLine/topoTension/selectedFaceId）
  const [annotations, setAnnotations] = useState<RouteTopoAnnotation[]>([])
  const [activeAnnotationIndex, setActiveAnnotationIndex] = useState(0)

  // Derived values from active annotation
  const activeAnnotation = annotations[activeAnnotationIndex] ?? null
  const topoLine = activeAnnotation?.topoLine ?? []
  const topoTension = activeAnnotation?.topoTension ?? 0
  const selectedFaceId = activeAnnotation?.faceId ?? null

  // Image state
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
  const topoSnapshotRef = useRef<{ annotations: RouteTopoAnnotation[]; index: number } | null>(null)

  // Dirty check：比较当前 annotations 与路由原始数据
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!selectedRoute) return false

    // 字段变更
    const fields = ['name', 'grade', 'area', 'FA', 'setter', 'description'] as const
    for (const field of fields) {
      if ((editedRoute[field] ?? '') !== (selectedRoute[field] ?? '')) return true
    }

    // annotations 变更：与原始数据对比
    const original = buildInitialAnnotations(selectedRoute)
    if (annotations.length !== original.length) return true
    for (let i = 0; i < annotations.length; i++) {
      if (annotations[i].faceId !== original[i].faceId) return true
      const aLine = annotations[i].topoLine
      const oLine = original[i].topoLine
      if (aLine.length !== oLine.length) return true
      for (let j = 0; j < aLine.length; j++) {
        if (aLine[j].x !== oLine[j].x || aLine[j].y !== oLine[j].y) return true
      }
      if ((annotations[i].topoTension ?? 0) !== (original[i].topoTension ?? 0)) return true
    }

    return false
  }, [selectedRoute, editedRoute, annotations])

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
    setFormErrors({})

    const initialAnnotations = buildInitialAnnotations(selectedRoute)
    setAnnotations(initialAnnotations)
    setActiveAnnotationIndex(0)

    if (justSavedRef.current) {
      justSavedRef.current = false
      return
    }

    const firstAnnotation = initialAnnotations[0] ?? null
    if (firstAnnotation) {
      const url = faceImageCache.getImageUrl({
        cragId: selectedRoute.cragId,
        area: firstAnnotation.area,
        faceId: firstAnnotation.faceId,
      })
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

  // Annotation management
  const addAnnotation = useCallback((faceId: string, area: string) => {
    if (!selectedRoute) return
    const newAnnotation: RouteTopoAnnotation = { faceId, area, topoLine: [] }
    setAnnotations(prev => {
      const next = [...prev, newAnnotation]
      setActiveAnnotationIndex(next.length - 1)
      return next
    })
    const url = faceImageCache.getImageUrl({ cragId: selectedRoute.cragId, area, faceId })
    setImageUrl(url)
    setIsImageLoading(true)
    setImageLoadError(false)
    setImageAspectRatio(undefined)
  }, [selectedRoute, faceImageCache])

  const removeAnnotation = useCallback((index: number) => {
    setAnnotations(prev => {
      const next = prev.filter((_, i) => i !== index)
      const newIndex = Math.min(index, Math.max(0, next.length - 1))
      setActiveAnnotationIndex(newIndex)
      // 更新 imageUrl 到新的 active annotation
      const newActive = next[newIndex]
      if (newActive && selectedRoute) {
        const url = faceImageCache.getImageUrl({
          cragId: selectedRoute.cragId,
          area: newActive.area,
          faceId: newActive.faceId,
        })
        setImageUrl(url)
        setIsImageLoading(true)
        setImageAspectRatio(undefined)
      } else {
        setImageUrl(null)
      }
      return next
    })
  }, [selectedRoute, faceImageCache])

  const updateActiveTopoLine = useCallback((points: TopoPoint[]) => {
    setAnnotations(prev => prev.map((a, i) =>
      i === activeAnnotationIndex ? { ...a, topoLine: points } : a
    ))
  }, [activeAnnotationIndex])

  const updateActiveTopoTension = useCallback((tension: number) => {
    setAnnotations(prev => prev.map((a, i) =>
      i === activeAnnotationIndex ? { ...a, topoTension: tension } : a
    ))
  }, [activeAnnotationIndex])

  // Canvas operations (delegate to active annotation)
  const handleRemoveLastPoint = useCallback(() => {
    updateActiveTopoLine(topoLine.slice(0, -1))
  }, [topoLine, updateActiveTopoLine])

  const handleClearPoints = useCallback(() => {
    updateActiveTopoLine([])
    updateActiveTopoTension(0)
  }, [updateActiveTopoLine, updateActiveTopoTension])

  // Fullscreen topo
  const handleOpenFullscreen = useCallback(() => {
    topoSnapshotRef.current = { annotations: annotations.map(a => ({ ...a, topoLine: [...a.topoLine] })), index: activeAnnotationIndex }
    setIsFullscreenEdit(true)
  }, [annotations, activeAnnotationIndex])

  const handleFullscreenClose = useCallback((confirmed: boolean) => {
    if (!confirmed && topoSnapshotRef.current) {
      setAnnotations(topoSnapshotRef.current.annotations)
      setActiveAnnotationIndex(topoSnapshotRef.current.index)
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
      const validAnnotations = annotations.filter(a => a.topoLine.length >= 2)
      const firstAnnotation = validAnnotations[0]

      const response = await fetch(`/api/routes/${selectedRoute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editedRoute,
          topoAnnotations: validAnnotations,
          // compat sync：旧字段同步自第一条标注，保持向后兼容
          faceId: firstAnnotation?.faceId ?? null,
          topoLine: firstAnnotation?.topoLine ?? null,
          topoTension: firstAnnotation?.topoTension ?? null,
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
  }, [selectedRoute, editedRoute, annotations, setRoutes, showToast, persistedAreas, selectedCragId, updateCragAreas])

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

  // Face selection — 新增标注（兼容旧 handleFaceSelect 调用）
  const handleFaceSelect = useCallback((faceId: string, area: string) => {
    addAnnotation(faceId, area)
  }, [addAnnotation])

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

  // SVG computations（基于激活标注的派生值）
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
    setAnnotations([])
    setActiveAnnotationIndex(0)
    setImageUrl(null)
    setImageLoadError(false)
    setIsImageLoading(false)
  }, [])

  return {
    // Edit state
    editedRoute,
    setEditedRoute,
    formErrors,
    setFormErrors,

    // Multi-annotation state
    annotations,
    activeAnnotationIndex,
    setActiveAnnotationIndex,
    addAnnotation,
    removeAnnotation,
    updateActiveTopoLine,
    updateActiveTopoTension,

    // Derived from active annotation（供现有 UI 组件直接读取，无需改动）
    topoLine,
    topoTension,
    selectedFaceId,

    // Legacy setters（保持向后兼容，供 routes/page.tsx 画布点击使用）
    setTopoLine: updateActiveTopoLine,
    setTopoTension: updateActiveTopoTension,

    // Image state
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
