'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  ArrowLeft,
  Save,
  Check,
  Loader2,
  Search,
  X,
  Sparkles,
  Mountain,
  Edit3,
  Maximize,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Link } from '@/i18n/navigation'
import { AppTabbar } from '@/components/app-tabbar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Route, TopoPoint } from '@/types'
import { bezierCurve, scalePoints, normalizePoint } from '@/lib/topo-utils'
import { getGradeColor } from '@/lib/tokens'
import { useToast } from '@/components/ui/toast'
import { useFaceImageCache } from '@/hooks/use-face-image'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import { matchRouteByQuery } from '@/hooks/use-route-search'
import { useCragRoutes } from '@/hooks/use-crag-routes'
import { CragSelector } from '@/components/editor/crag-selector'
import { RouteCard } from '@/components/editor/route-card'
import { AreaSelect } from '@/components/editor/area-select'
import { MultiTopoLineOverlay } from '@/components/multi-topo-line-overlay'
import type { MultiTopoRoute } from '@/components/multi-topo-line-overlay'
import { VIEW_WIDTH, VIEW_HEIGHT, GRADE_OPTIONS } from '@/lib/editor-utils'
import { deriveAreas, getPersistedAreas } from '@/lib/editor-areas'

const FullscreenTopoEditor = dynamic(
  () => import('@/components/editor/fullscreen-topo-editor'),
  { ssr: false }
)

interface R2FaceInfo {
  faceId: string
  area: string
}

interface FaceGroup {
  faceId: string
  area: string
  routes: Route[]
  imageUrl: string
}

type PendingAction =
  | { type: 'switchRoute'; payload: Route }
  | { type: 'switchArea'; payload: string | null }
  | { type: 'switchCrag'; payload: string }
  | { type: 'clearTopo' }
  | { type: 'goBackMobile' }

/**
 * 线路标注页面
 * 选 crag → 选 area → 选线路 → 自动匹配 face → 画 topoLine
 */
export default function RouteAnnotationPage() {
  const {
    crags, routes, setRoutes, selectedCragId, setSelectedCragId,
    isLoadingCrags, isLoadingRoutes, stats, updateCragAreas,
  } = useCragRoutes()
  const faceImageCache = useFaceImageCache()

  // ============ R2 上已有的 face 列表 ============
  const [r2Faces, setR2Faces] = useState<R2FaceInfo[]>([])
  const [isLoadingFaces, setIsLoadingFaces] = useState(false)

  // ============ 选择状态 ============
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)

  // ============ 搜索和筛选 ============
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'marked' | 'unmarked'>('all')

  // ============ 编辑状态 ============
  const [editedRoute, setEditedRoute] = useState<Partial<Route>>({})
  const [topoLine, setTopoLine] = useState<TopoPoint[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)

  // ============ 保存状态 ============
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ============ 新增线路状态 ============
  const [isCreatingRoute, setIsCreatingRoute] = useState(false)
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false)
  const [newRoute, setNewRoute] = useState({
    name: '', grade: '？', area: '', FA: '', setter: '', description: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // ============ UI 状态 ============
  const [showEditorPanel, setShowEditorPanel] = useState(false)
  const [isFullscreenEdit, setIsFullscreenEdit] = useState(false)
  const [showOtherRoutes, setShowOtherRoutes] = useState(true)

  // ============ 脏检查状态 ============
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showClearTopoDialog, setShowClearTopoDialog] = useState(false)

  // ============ Refs ============
  const containerRef = useRef<HTMLDivElement>(null)
  const justSavedRef = useRef(false)

  // ============ Toast ============
  const { showToast } = useToast()

  // ============ 脏检查：检测未保存的更改 ============
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!selectedRoute) return false
    const fields = ['name', 'grade', 'area', 'FA', 'setter', 'description'] as const
    for (const field of fields) {
      if ((editedRoute[field] ?? '') !== (selectedRoute[field] ?? '')) return true
    }
    // Deep compare topoLine
    if (JSON.stringify(topoLine) !== JSON.stringify(selectedRoute.topoLine || [])) return true
    return false
  }, [selectedRoute, editedRoute, topoLine])

  const executePendingAction = useCallback((action: PendingAction) => {
    switch (action.type) {
      case 'switchRoute':
        setSelectedRoute(action.payload)
        break
      case 'switchArea':
        setSelectedArea(action.payload)
        setSelectedRoute(null)
        setShowEditorPanel(false)
        break
      case 'switchCrag':
        setSelectedCragId(action.payload)
        setSelectedRoute(null)
        setSelectedArea(null)
        setSelectedFaceId(null)
        setShowEditorPanel(false)
        break
      case 'clearTopo':
        setTopoLine([])
        break
      case 'goBackMobile':
        setShowEditorPanel(false)
        setSelectedRoute(null)
        break
    }
  }, [setSelectedCragId])

  // ============ 脏检查：拦截处理器 ============
  const handleRouteClick = useCallback((route: Route) => {
    if (selectedRoute?.id === route.id) return
    if (hasUnsavedChanges()) {
      setPendingAction({ type: 'switchRoute', payload: route })
      setShowUnsavedDialog(true)
      return
    }
    setSelectedRoute(route)
  }, [selectedRoute, hasUnsavedChanges])

  const handleAreaSwitch = useCallback((area: string | null) => {
    if (selectedArea === area) return
    if (hasUnsavedChanges()) {
      setPendingAction({ type: 'switchArea', payload: area })
      setShowUnsavedDialog(true)
      return
    }
    setSelectedArea(area)
    setSelectedRoute(null)
    setShowEditorPanel(false)
  }, [selectedArea, hasUnsavedChanges])

  const handleClearPointsWithConfirm = useCallback(() => {
    if (topoLine.length === 0) return
    setShowClearTopoDialog(true)
  }, [topoLine.length])

  const handleConfirmClearTopo = useCallback(() => {
    setTopoLine([])
    setShowClearTopoDialog(false)
  }, [])

  const handleDiscardAndExecute = useCallback(() => {
    if (!pendingAction) return
    executePendingAction(pendingAction)
    setPendingAction(null)
    setShowUnsavedDialog(false)
  }, [pendingAction, executePendingAction])

  // handleSaveAndExecute is defined after handleSave below

  // ============ 从 R2 加载岩面列表 ============
  useEffect(() => {
    if (!selectedCragId) {
      setR2Faces([])
      return
    }
    let cancelled = false
    setIsLoadingFaces(true)
    fetch(`/api/faces?cragId=${encodeURIComponent(selectedCragId)}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.success) setR2Faces(data.faces as R2FaceInfo[])
      })
      .catch(() => { /* 静默失败，回退到仅 route 派生 */ })
      .finally(() => { if (!cancelled) setIsLoadingFaces(false) })
    return () => { cancelled = true }
  }, [selectedCragId])

  // ============ 桌面端突破 app-shell 宽度限制 ============
  useBreakAppShellLimit()

  // ============ 派生数据 ============
  // 合并 crag.areas 与 route 派生 areas
  const selectedCrag = useMemo(() => crags.find(c => c.id === selectedCragId), [crags, selectedCragId])
  const areas = useMemo(
    () => deriveAreas(routes, selectedCragId, selectedCrag),
    [routes, selectedCrag, selectedCragId],
  )
  const persistedAreas = useMemo(() => getPersistedAreas(selectedCrag), [selectedCrag])

  // 按 area 筛选的 face 列表（右栏 face 选择器用）
  // 以 R2 返回的 face 数据为主（自带 area），再关联 routes
  const areaFaceGroups = useMemo(() => {
    if (!selectedCragId) return []
    const map = new Map<string, FaceGroup>()

    // 从 R2 数据构建 face 列表（每个 face 自带 area）
    r2Faces.forEach(({ faceId, area }) => {
      map.set(faceId, {
        faceId,
        area,
        routes: [],
        imageUrl: faceImageCache.getImageUrl({ cragId: selectedCragId, area, faceId }),
      })
    })

    // 关联 routes 到对应的 face
    routes.forEach(r => {
      if (!r.faceId) return
      const entry = map.get(r.faceId)
      if (entry) entry.routes.push(r)
    })

    let result = Array.from(map.values())
    // 按 area 过滤
    if (selectedArea) {
      result = result.filter(f => f.area === selectedArea)
    }
    return result
  }, [routes, r2Faces, selectedCragId, selectedArea, faceImageCache])

  // 按 area 筛选的线路
  const areaRoutes = useMemo(() => {
    if (!selectedArea) return routes
    return routes.filter(r => r.area === selectedArea)
  }, [routes, selectedArea])

  // 筛选后的线路列表
  const filteredRoutes = useMemo(() => {
    let result = areaRoutes

    if (searchQuery) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter((r) => {
        if (matchRouteByQuery(r, query)) return true
        if (r.area?.toLowerCase().includes(query)) return true
        if (r.grade.toLowerCase().includes(query)) return true
        return false
      })
    }

    if (filterMode === 'marked') {
      result = result.filter((r) => r.topoLine && r.topoLine.length >= 2)
    } else if (filterMode === 'unmarked') {
      result = result.filter((r) => !r.topoLine || r.topoLine.length < 2)
    }

    return result
  }, [areaRoutes, searchQuery, filterMode])

  // Area 内的统计
  const areaStats = useMemo(() => {
    const marked = areaRoutes.filter((r) => r.topoLine && r.topoLine.length >= 2)
    return {
      total: areaRoutes.length,
      marked: marked.length,
      unmarked: areaRoutes.length - marked.length,
    }
  }, [areaRoutes])

  // ============ 同岩面的其他线路（用于多线路叠加） ============
  const sameFaceRoutes = useMemo<MultiTopoRoute[]>(() => {
    if (!selectedRoute?.faceId || !showOtherRoutes) return []
    const faceGroup = areaFaceGroups.find(f => f.faceId === selectedRoute.faceId)
    if (!faceGroup) return []
    return faceGroup.routes
      .filter(r => r.id !== selectedRoute.id && r.topoLine && r.topoLine.length >= 2)
      .map(r => ({ id: r.id, name: r.name, grade: r.grade, topoLine: r.topoLine! }))
  }, [selectedRoute, areaFaceGroups, showOtherRoutes])

  // ============ 切换岩场 ============
  const handleSelectCrag = useCallback((id: string) => {
    if (hasUnsavedChanges()) {
      setPendingAction({ type: 'switchCrag', payload: id })
      setShowUnsavedDialog(true)
      return
    }
    setSelectedCragId(id)
    setSelectedRoute(null)
    setSelectedArea(null)
    setSelectedFaceId(null)
    setShowEditorPanel(false)
  }, [setSelectedCragId, hasUnsavedChanges])

  // ============ 选择线路时初始化编辑状态 ============
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
    setFormErrors({})
    setShowEditorPanel(true)

    if (justSavedRef.current) {
      justSavedRef.current = false
      return
    }

    // 自动匹配 faceId：线路有 faceId → 自动选中；无则清空让用户手动选
    const autoFaceId = selectedRoute.faceId || null
    setSelectedFaceId(autoFaceId)

    if (autoFaceId && selectedRoute.area) {
      const url = faceImageCache.getImageUrl({ cragId: selectedRoute.cragId, area: selectedRoute.area, faceId: autoFaceId })
      // 仅当 URL 变化时才触发 loading，避免同岩面切换线路时 onLoad 不触发导致永久 loading
      setImageUrl(prev => {
        if (prev === url) return prev
        setIsImageLoading(true)
        return url
      })
      setImageLoadError(false)
    } else {
      setImageUrl(null)
      setImageLoadError(false)
    }
  }, [selectedRoute, faceImageCache])

  // ============ 画布操作 ============
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const point = normalizePoint(x, y, rect.width, rect.height)
    setTopoLine((prev) => [...prev, point])
  }, [])

  const handleRemoveLastPoint = useCallback(() => {
    setTopoLine((prev) => prev.slice(0, -1))
  }, [])

  const handleClearPoints = useCallback(() => {
    setTopoLine([])
  }, [])

  // ============ 保存逻辑 ============
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
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '保存失败')

      setSaveSuccess(true)
      justSavedRef.current = true

      setRoutes((prev) => prev.map((r) => (r.id === selectedRoute.id ? data.route : r)))
      setSelectedRoute(data.route)

      // 如果区域是新的，同步到 crag.areas（仅基于持久化 areas，避免 route 派生 area 泄漏）
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
  }, [selectedRoute, editedRoute, topoLine, selectedFaceId, setRoutes, showToast, persistedAreas, selectedCragId, updateCragAreas])

  const handleSaveAndExecute = useCallback(async () => {
    if (!pendingAction) return
    const success = await handleSave()
    if (success) {
      justSavedRef.current = false // Reset so pending action initializes properly
      executePendingAction(pendingAction)
    }
    // Always close dialog on both success and failure:
    // - Success: action executed, dialog no longer needed
    // - Failure: edits are preserved in the form; user can see inline errors
    //   (validation) or toast (network), fix issues, and save manually
    setPendingAction(null)
    setShowUnsavedDialog(false)
  }, [pendingAction, handleSave, executePendingAction])

  // ============ 新增线路逻辑 ============
  const handleStartCreate = useCallback(() => {
    if (hasUnsavedChanges()) {
      showToast('请先保存当前线路的更改', 'info', 3000)
      return
    }
    setIsCreatingRoute(true)
    setSelectedRoute(null)
    setShowEditorPanel(true)
    const defaultArea = selectedArea || (areas.length > 0 ? areas[0] : '')
    setNewRoute({
      name: '', grade: '？', area: defaultArea, FA: '', setter: '', description: '',
    })
    setFormErrors({})
  }, [selectedArea, areas, hasUnsavedChanges, showToast])

  function validateRouteForm(data: { name: string; area: string }): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!data.name.trim()) errors.name = '请输入线路名称'
    if (!data.area.trim()) errors.area = '请选择区域'
    return errors
  }

  const handleSubmitCreate = useCallback(async () => {
    const errors = validateRouteForm(newRoute)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    if (!selectedCragId) return

    setIsSubmittingCreate(true)
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRoute, cragId: selectedCragId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '创建失败')

      const created = data.route as Route
      setRoutes(prev => [...prev, created])
      setIsCreatingRoute(false)
      setSelectedRoute(created)

      // 如果区域是新的，同步到 crag.areas（仅基于持久化 areas）
      const createdArea = newRoute.area.trim()
      if (createdArea && selectedCragId && !persistedAreas.includes(createdArea)) {
        const merged = [...new Set([...persistedAreas, createdArea])].sort()
        updateCragAreas(selectedCragId, merged).catch(() => {})
      }

      showToast(`线路「${created.name}」创建成功！`, 'success', 3000)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '创建失败', 'error', 4000)
    } finally {
      setIsSubmittingCreate(false)
    }
  }, [selectedCragId, newRoute, setRoutes, showToast, persistedAreas, updateCragAreas])

  const handleCancelCreate = useCallback(() => {
    setIsCreatingRoute(false)
    setShowEditorPanel(false)
    setFormErrors({})
  }, [])

  // ============ SVG 计算 ============
  const routeColor = useMemo(
    () => getGradeColor(editedRoute.grade || selectedRoute?.grade || '？'),
    [editedRoute.grade, selectedRoute?.grade]
  )

  const pathData = useMemo(() => {
    if (topoLine.length < 2) return ''
    const scaled = scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT)
    return bezierCurve(scaled)
  }, [topoLine])

  const scaledPoints = useMemo(
    () => scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT),
    [topoLine]
  )

  // ============ 左栏 ============
  const leftPanel = (
    <div className="flex flex-col h-full">
      <CragSelector
        crags={crags}
        selectedCragId={selectedCragId}
        isLoading={isLoadingCrags}
        onSelect={handleSelectCrag}
        stats={stats}
      />

      {selectedCragId && (
        <>
          {/* Area 芯片选择器 */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1.5 px-1" style={{ color: 'var(--theme-on-surface-variant)' }}>
              选择区域
            </label>
            {isLoadingRoutes ? (
              <div className="flex items-center justify-center py-4" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <div className="w-5 h-5 animate-spin"><Loader2 className="w-full h-full" /></div>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                <button
                  onClick={() => handleAreaSwitch(null)}
                  className="px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 font-medium text-sm"
                  style={{
                    backgroundColor: selectedArea === null ? 'var(--theme-primary)' : 'var(--theme-surface-variant)',
                    color: selectedArea === null ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)',
                  }}
                >
                  全部 ({routes.length})
                </button>
                {areas.map(area => {
                  const count = routes.filter(r => r.area === area).length
                  return (
                    <button
                      key={area}
                      onClick={() => handleAreaSwitch(area)}
                      className="px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 font-medium text-sm"
                      style={{
                        backgroundColor: selectedArea === area ? 'var(--theme-primary)' : 'var(--theme-surface-variant)',
                        color: selectedArea === area ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)',
                      }}
                    >
                      {area} ({count})
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 搜索和筛选 */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
            <Input
              variant="search"
              placeholder="搜索线路..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="pl-12 pr-10 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full" style={{ backgroundColor: 'var(--theme-outline)' }}>
                <X className="w-4 h-4" style={{ color: 'var(--theme-on-surface)' }} />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3">
            {[
              { key: 'all' as const, label: '全部', count: areaStats.total },
              { key: 'unmarked' as const, label: '待标注', count: areaStats.unmarked },
              { key: 'marked' as const, label: '已标注', count: areaStats.marked },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setFilterMode(filter.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95"
                style={{
                  backgroundColor: filterMode === filter.key ? 'var(--theme-primary)' : 'var(--theme-surface-variant)',
                  color: filterMode === filter.key ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)',
                }}
              >
                <span className="font-medium">{filter.label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                  backgroundColor: filterMode === filter.key ? 'color-mix(in srgb, var(--theme-on-primary) 20%, transparent)' : 'var(--theme-outline-variant)',
                }}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          {/* 新增线路按钮 */}
          <button
            onClick={handleStartCreate}
            className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 mb-3 transition-all duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))',
              color: 'var(--theme-primary)',
              border: '1.5px dashed var(--theme-primary)',
              borderRadius: 'var(--theme-radius-xl)',
            }}
          >
            <Plus className="w-5 h-5" />
            新增线路
          </button>

          {/* 线路列表 */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {filteredRoutes.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">未找到匹配线路</p>
              </div>
            ) : (
              filteredRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isSelected={selectedRoute?.id === route.id}
                  onClick={() => handleRouteClick(route)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )

  // ============ 右栏：编辑面板 ============
  const rightPanel = (
    <div className="h-full overflow-y-auto">
      {!selectedCragId ? (
        <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-on-surface-variant)' }}>
          <Mountain className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">选择岩场开始标注</p>
        </div>
      ) : isCreatingRoute ? (
        /* 新增线路表单 */
        <div className="max-w-lg mx-auto space-y-4 animate-fade-in-up">
          <div
            className="flex items-center gap-3 p-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
              borderRadius: 'var(--theme-radius-xl)',
              border: '2px solid var(--theme-primary)',
            }}
          >
            <Plus className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>新增线路</h2>
          </div>

          <div className="p-4" style={{ backgroundColor: 'var(--theme-surface-variant)', borderRadius: 'var(--theme-radius-xl)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>名称 *</label>
                <Input
                  value={newRoute.name}
                  onChange={(v) => { setNewRoute(prev => ({ ...prev, name: v })); setFormErrors(prev => { const next = {...prev}; delete next.name; return next }) }}
                  placeholder="线路名称"
                  style={formErrors.name ? { borderColor: 'var(--theme-error)' } : undefined}
                />
                {formErrors.name && (
                  <p className="text-xs mt-1" style={{ color: 'var(--theme-error)' }} role="alert">
                    {formErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>难度 *</label>
                <select
                  value={newRoute.grade}
                  onChange={(e) => setNewRoute(prev => ({ ...prev, grade: e.target.value }))}
                >
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>区域 *</label>
                <AreaSelect
                  areas={areas}
                  value={newRoute.area}
                  onChange={(area) => { setNewRoute(prev => ({ ...prev, area })); setFormErrors(prev => { const next = {...prev}; delete next.area; return next }) }}
                  placeholder="选择区域..."
                  required
                  error={formErrors.area}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>首攀者 (FA)</label>
                <Input
                  value={newRoute.FA}
                  onChange={(v) => setNewRoute(prev => ({ ...prev, FA: v }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>定线者</label>
                <Input
                  value={newRoute.setter}
                  onChange={(v) => setNewRoute(prev => ({ ...prev, setter: v }))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>描述</label>
                <Textarea
                  value={newRoute.description}
                  onChange={(v) => setNewRoute(prev => ({ ...prev, description: v }))}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelCreate}
              className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
              style={{ backgroundColor: 'var(--theme-surface-variant)', color: 'var(--theme-on-surface)' }}
            >
              取消
            </button>
            <button
              onClick={handleSubmitCreate}
              disabled={isSubmittingCreate}
              className="flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-on-primary)',
                opacity: isSubmittingCreate ? 0.6 : 1,
              }}
            >
              {isSubmittingCreate ? (
                <><div className="w-5 h-5 animate-spin"><Loader2 className="w-full h-full" /></div> 创建中...</>
              ) : (
                <><Plus className="w-5 h-5" /> 创建线路</>
              )}
            </button>
          </div>
        </div>
      ) : !selectedRoute ? (
        <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-on-surface-variant)' }}>
          <Edit3 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium mb-1">选择线路开始标注</p>
          <p className="text-sm">从左侧列表选择要标注的线路</p>
        </div>
      ) : (
        /* 线路编辑面板 */
        <div className="space-y-4 animate-fade-in-up">
          {/* 线路标题 */}
          <div
            className="flex items-center gap-3 p-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
              borderRadius: 'var(--theme-radius-xl)',
              border: `2px solid ${routeColor}`,
            }}
          >
            <Sparkles className="w-5 h-5" style={{ color: routeColor }} />
            <div className="flex-1">
              <h2 className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>
                {selectedRoute.name}
              </h2>
              <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
                {selectedRoute.area} · {selectedRoute.grade}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ backgroundColor: routeColor }}>
              {selectedRoute.grade}
            </div>
          </div>

          {/* 岩面选择器 */}
          <div className="p-4" style={{ backgroundColor: 'var(--theme-surface-variant)', borderRadius: 'var(--theme-radius-xl)' }}>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--theme-on-surface-variant)' }}>
              选择岩面 {selectedFaceId && <span style={{ color: 'var(--theme-primary)' }}>· {selectedFaceId}</span>}
            </label>
            {isLoadingFaces ? (
              <div className="flex items-center justify-center py-3" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <div className="w-5 h-5 animate-spin"><Loader2 className="w-full h-full" /></div>
              </div>
            ) : areaFaceGroups.length === 0 ? (
              <div className="text-center py-3" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <p className="text-sm">暂无岩面数据</p>
                <Link href="/editor/faces" className="text-sm font-medium mt-1 inline-block" style={{ color: 'var(--theme-primary)' }}>
                  去岩面管理页面创建 →
                </Link>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {areaFaceGroups.map(face => (
                  <button
                    key={face.faceId}
                    onClick={async () => {
                      // 已选中的岩面不重复操作
                      if (face.faceId === selectedFaceId) return
                      setSelectedFaceId(face.faceId)
                      setTopoLine([])  // 切换岩面时清空旧控制点
                      const url = faceImageCache.getImageUrl({ cragId: selectedRoute.cragId, area: face.area, faceId: face.faceId })
                      setImageUrl(url)
                      setIsImageLoading(true)
                      setImageLoadError(false)
                      // 立即绑定 faceId 到线路
                      try {
                        const res = await fetch(`/api/routes/${selectedRoute.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ faceId: face.faceId }),
                        })
                        if (res.ok) {
                          const data = await res.json()
                          setRoutes(prev => prev.map(r => r.id === selectedRoute.id ? data.route : r))
                        }
                      } catch { /* 静默失败，保存时会再次绑定 */ }
                    }}
                    className={`flex-shrink-0 p-1.5 transition-all duration-200 active:scale-[0.98] ${selectedFaceId === face.faceId ? 'ring-2' : ''}`}
                    style={{
                      backgroundColor: selectedFaceId === face.faceId
                        ? 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))'
                        : 'var(--theme-surface)',
                      borderRadius: 'var(--theme-radius-lg)',
                      // @ts-expect-error -- CSS custom properties
                      '--tw-ring-color': 'var(--theme-primary)',
                    }}
                  >
                    <div className="w-20 h-14 rounded-md overflow-hidden" style={{ backgroundColor: 'var(--theme-surface-variant)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={face.imageUrl}
                        alt={face.faceId}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                    <p className="text-xs mt-1 text-center truncate w-20" style={{ color: 'var(--theme-on-surface-variant)' }}>
                      {face.faceId}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Topo 画布 */}
          <div className="overflow-hidden" style={{ backgroundColor: 'var(--theme-surface-variant)', borderRadius: 'var(--theme-radius-xl)' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--theme-outline-variant)' }}>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--theme-on-surface)' }}>Topo 标注</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-on-surface-variant)' }}>点击图片添加控制点</p>
              </div>
              <div className="flex items-center gap-2">
                {sameFaceRoutes.length > 0 && (
                  <button
                    onClick={() => setShowOtherRoutes(prev => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: showOtherRoutes
                        ? 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))'
                        : 'var(--theme-surface)',
                      color: showOtherRoutes ? 'var(--theme-primary)' : 'var(--theme-on-surface-variant)',
                    }}
                    title={showOtherRoutes ? '隐藏其他线路' : '显示其他线路'}
                  >
                    {showOtherRoutes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {sameFaceRoutes.length}条
                  </button>
                )}
                <div className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}>
                  {topoLine.length} 个点
                </div>
              </div>
            </div>

            {!imageUrl || imageLoadError ? (
              <div className="m-4 rounded-xl flex flex-col items-center justify-center aspect-[4/3]" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <AlertCircle className="w-10 h-10 mb-3" style={{ color: 'var(--theme-warning)' }} />
                <p className="font-medium mb-1" style={{ color: 'var(--theme-on-surface)' }}>暂无岩面照片</p>
                <Link href="/editor/faces" className="text-sm font-medium mt-1" style={{ color: 'var(--theme-primary)' }}>
                  去岩面管理页面上传照片 →
                </Link>
              </div>
            ) : (
              <div className="p-4">
                <div
                  ref={containerRef}
                  className="relative rounded-xl overflow-hidden cursor-crosshair"
                  style={{ boxShadow: 'var(--theme-shadow-md)' }}
                  onClick={handleCanvasClick}
                >
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: 'var(--theme-surface-variant)' }}>
                      <div className="text-center">
                        <div className="w-8 h-8 animate-spin mx-auto mb-2"><Loader2 className="w-full h-full" style={{ color: 'var(--theme-primary)' }} /></div>
                        <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>加载云端图片...</p>
                      </div>
                    </div>
                  )}

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={imageUrl}
                    src={imageUrl}
                    alt="岩面照片"
                    className="w-full aspect-[4/3] object-cover"
                    style={{ opacity: isImageLoading ? 0 : 1 }}
                    draggable={false}
                    onLoad={() => { setIsImageLoading(false); setImageLoadError(false) }}
                    onError={() => { setIsImageLoading(false); setImageLoadError(true) }}
                  />

                  {/* 多线路叠加层（其他线路，灰色可点击） */}
                  {sameFaceRoutes.length > 0 && (
                    <MultiTopoLineOverlay
                      routes={sameFaceRoutes}
                      selectedRouteId={-1}
                      onRouteSelect={(routeId) => {
                        const target = routes.find(r => r.id === routeId)
                        if (target) handleRouteClick(target)
                      }}
                      preserveAspectRatio="none"
                    />
                  )}

                  {/* 当前线路 SVG 叠加层（带编号控制点，用于编辑） */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                    preserveAspectRatio="none"
                  >
                    {pathData && (
                      <path d={pathData} stroke={routeColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    )}
                    {scaledPoints.map((point, index) => (
                      <g key={index}>
                        <circle
                          cx={point.x} cy={point.y}
                          r={index === 0 ? 6 : index === scaledPoints.length - 1 ? 5 : 4}
                          fill={index === 0 ? routeColor : 'white'}
                          stroke={index === 0 ? 'white' : routeColor}
                          strokeWidth={index === 0 ? 1.5 : 2}
                        />
                        <text x={point.x} y={point.y + 2.5} textAnchor="middle" fontSize="7" fontWeight="bold" fill={index === 0 ? 'white' : routeColor}>
                          {index + 1}
                        </text>
                      </g>
                    ))}
                    {scaledPoints.length > 0 && (
                      <text x={scaledPoints[0].x - 12} y={scaledPoints[0].y + 18} fill={routeColor} fontSize="10" fontWeight="bold">起点</text>
                    )}
                    {scaledPoints.length > 1 && (
                      <text x={scaledPoints[scaledPoints.length - 1].x - 12} y={scaledPoints[scaledPoints.length - 1].y - 12} fill={routeColor} fontSize="10" fontWeight="bold">终点</text>
                    )}
                  </svg>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 mt-4">
                  <button
                    className="flex-1 py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)', boxShadow: 'var(--theme-shadow-sm)' }}
                    onClick={handleRemoveLastPoint}
                    disabled={topoLine.length === 0}
                  >
                    <Trash2 className="w-4 h-4" /> 撤销
                  </button>
                  <button
                    className="flex-1 py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--theme-error)', color: 'white', opacity: topoLine.length === 0 ? 0.5 : 1 }}
                    onClick={handleClearPointsWithConfirm}
                    disabled={topoLine.length === 0}
                  >
                    <Trash2 className="w-4 h-4" /> 清空
                  </button>
                  <button
                    className="py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-on-primary)', boxShadow: 'var(--theme-shadow-sm)' }}
                    onClick={() => setIsFullscreenEdit(true)}
                  >
                    <Maximize className="w-4 h-4" /> 全屏
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 线路信息编辑 */}
          <div className="p-4" style={{ backgroundColor: 'var(--theme-surface-variant)', borderRadius: 'var(--theme-radius-xl)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--theme-on-surface)' }}>线路信息</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>名称 *</label>
                <Input
                  value={editedRoute.name || ''}
                  onChange={(v) => { setEditedRoute((prev) => ({ ...prev, name: v })); setFormErrors(prev => { const next = {...prev}; delete next.name; return next }) }}
                  style={formErrors.name ? { borderColor: 'var(--theme-error)' } : undefined}
                />
                {formErrors.name && (
                  <p className="text-xs mt-1" style={{ color: 'var(--theme-error)' }} role="alert">
                    {formErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>难度</label>
                <select
                  value={editedRoute.grade || ''}
                  onChange={(e) => setEditedRoute((prev) => ({ ...prev, grade: e.target.value }))}
                >
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>区域</label>
                <AreaSelect
                  areas={areas}
                  value={editedRoute?.area || ''}
                  onChange={(area) => { setEditedRoute(prev => prev ? { ...prev, area } : prev); setFormErrors(prev => { const next = {...prev}; delete next.area; return next }) }}
                  placeholder="选择区域..."
                  required
                  error={formErrors.area}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>首攀者 (FA)</label>
                <Input
                  value={editedRoute.FA || ''}
                  onChange={(v) => setEditedRoute((prev) => ({ ...prev, FA: v }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>定线者</label>
                <Input
                  value={editedRoute.setter || ''}
                  onChange={(v) => setEditedRoute((prev) => ({ ...prev, setter: v }))}
                />
              </div>
              <div className="col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>描述</label>
                <Textarea
                  value={editedRoute.description || ''}
                  onChange={(v) => setEditedRoute((prev) => ({ ...prev, description: v }))}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: saveSuccess ? 'var(--theme-success)' : 'var(--theme-primary)',
              color: saveSuccess ? 'white' : 'var(--theme-on-primary)',
              boxShadow: `0 4px 16px ${saveSuccess ? 'var(--theme-success)' : 'var(--theme-primary)'}40`,
              opacity: isSaving ? 0.8 : 1,
            }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <><div className="w-5 h-5 animate-spin"><Loader2 className="w-full h-full" /></div> 保存中...</>
            ) : saveSuccess ? (
              <><Check className="w-5 h-5" /> 保存成功</>
            ) : (
              <><Save className="w-5 h-5" /> 保存更改</>
            )}
          </button>

          {saveError && (
            <div className="p-3 rounded-xl flex items-center gap-2 animate-fade-in-up" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-error) 12%, var(--theme-surface))', color: 'var(--theme-error)' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{saveError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ============ 渲染 ============
  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ backgroundColor: 'var(--theme-surface)' }}>
      <header
        className="sticky top-0 z-40 px-4 lg:px-6 py-3 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-surface) 85%, transparent)',
          borderBottom: '1px solid var(--theme-outline-variant)',
        }}
      >
        <div className="flex items-center justify-between max-w-4xl lg:max-w-none mx-auto">
          <Link
            href="/editor"
            className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
            style={{ color: 'var(--theme-primary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </Link>
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            <h1 className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>线路标注</h1>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl lg:max-w-none mx-auto px-4 lg:px-6 py-4">
        {/* 桌面端双栏 */}
        <div className="hidden lg:flex lg:gap-6 lg:h-[calc(100vh-73px)]">
          <div className="w-[380px] flex-shrink-0 flex flex-col overflow-hidden">
            {leftPanel}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {rightPanel}
          </div>
        </div>

        {/* 移动端 */}
        <div className="lg:hidden">
          {!showEditorPanel ? (
            leftPanel
          ) : isCreatingRoute ? (
            <div className="space-y-4 animate-fade-in-up">
              <button
                onClick={handleCancelCreate}
                className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
                style={{ color: 'var(--theme-primary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">返回线路列表</span>
              </button>
              {rightPanel}
            </div>
          ) : selectedRoute ? (
            <div className="space-y-4 animate-fade-in-up">
              <button
                onClick={() => {
                  if (hasUnsavedChanges()) {
                    setPendingAction({ type: 'goBackMobile' })
                    setShowUnsavedDialog(true)
                    return
                  }
                  setShowEditorPanel(false)
                  setSelectedRoute(null)
                }}
                className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
                style={{ color: 'var(--theme-primary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">返回线路列表</span>
              </button>
              {rightPanel}
            </div>
          ) : null}
        </div>
      </div>

      {/* 全屏编辑 */}
      {isFullscreenEdit && imageUrl && (
        <FullscreenTopoEditor
          imageUrl={imageUrl}
          topoLine={topoLine}
          routeColor={routeColor}
          onAddPoint={(point) => setTopoLine(prev => [...prev, point])}
          onRemoveLastPoint={handleRemoveLastPoint}
          onClearPoints={handleClearPoints}
          onClose={() => setIsFullscreenEdit(false)}
        />
      )}

      {/* 未保存更改确认对话框 */}
      {showUnsavedDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setShowUnsavedDialog(false); setPendingAction(null) }}
        >
          <div
            className="mx-4 w-full max-w-sm p-6 rounded-xl"
            style={{ backgroundColor: 'var(--theme-surface)', boxShadow: 'var(--theme-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-on-surface)' }}>
              有未保存的修改
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--theme-on-surface-variant)' }}>
              当前线路的修改尚未保存，切换后将丢失这些更改。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDiscardAndExecute}
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--theme-on-surface)',
                  border: '1.5px solid var(--theme-outline)',
                  opacity: isSaving ? 0.5 : 1,
                }}
              >
                丢弃
              </button>
              <button
                onClick={handleSaveAndExecute}
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? '保存中...' : '保存并切换'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 清空 Topo 确认对话框 */}
      {showClearTopoDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowClearTopoDialog(false)}
        >
          <div
            className="mx-4 w-full max-w-sm p-6 rounded-xl"
            style={{ backgroundColor: 'var(--theme-surface)', boxShadow: 'var(--theme-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--theme-on-surface)' }}>
              确定清空所有标注点？
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearTopoDialog(false)}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--theme-on-surface)',
                  border: '1.5px solid var(--theme-outline)',
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmClearTopo}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--theme-error)',
                  color: 'white',
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden">
        <AppTabbar />
      </div>
    </div>
  )
}
