'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  Upload,
  Trash2,
  Save,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  AlertCircle,
  Loader2,
  Search,
  X,
  Sparkles,
  CheckCircle2,
  Circle,
  Mountain,
  Edit3,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { AppTabbar } from '@/components/app-tabbar'
import type { Route, Crag, TopoPoint } from '@/types'
import { bezierCurve, scalePoints, normalizePoint } from '@/lib/topo-utils'
import { getGradeColor } from '@/lib/tokens'
import { getRouteTopoUrl } from '@/lib/constants'
import { useToast } from '@/components/ui/toast'
import { matchRouteByQuery } from '@/hooks/use-route-search'

// viewBox 尺寸 (与 Demo 页面保持一致)
const VIEW_WIDTH = 400
const VIEW_HEIGHT = 300

// 难度选项
const GRADE_OPTIONS = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7',
  'V8', 'V9', 'V10', 'V11', 'V12', 'V13', '？'
]

/**
 * 预加载图片并验证可访问
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url
    setTimeout(() => resolve(), 10000)
  })
}

/**
 * 线路卡片组件 - 用于线路列表
 */
function RouteCard({
  route,
  isSelected,
  onClick,
}: {
  route: Route
  isSelected: boolean
  onClick: () => void
}) {
  const hasTopo = route.topoLine && route.topoLine.length >= 2
  const gradeColor = getGradeColor(route.grade)

  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full text-left overflow-hidden
        transition-all duration-300 ease-out
        active:scale-[0.98]
        ${isSelected ? 'ring-2 ring-offset-2' : ''}
      `}
      style={{
        backgroundColor: isSelected
          ? 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))'
          : 'var(--theme-surface)',
        borderRadius: 'var(--theme-radius-xl)',
        boxShadow: isSelected ? 'var(--theme-shadow-md)' : 'var(--theme-shadow-sm)',
        // @ts-expect-error -- CSS custom properties for ring
        '--tw-ring-color': gradeColor,
        '--tw-ring-offset-color': 'var(--theme-surface)',
      }}
    >
      {/* 左侧难度色带 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
        style={{
          backgroundColor: gradeColor,
          opacity: isSelected ? 1 : 0.6,
        }}
      />

      <div className="flex items-center gap-3 p-3 pl-4">
        {/* 标注状态图标 */}
        <div
          className={`
            relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
            transition-all duration-300
            ${hasTopo ? 'animate-pulse-subtle' : ''}
          `}
          style={{
            backgroundColor: hasTopo
              ? 'color-mix(in srgb, var(--theme-success) 15%, var(--theme-surface))'
              : 'var(--theme-surface-variant)',
          }}
        >
          {hasTopo ? (
            <CheckCircle2
              className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
              style={{ color: 'var(--theme-success)' }}
            />
          ) : (
            <Circle
              className="w-5 h-5"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            />
          )}
        </div>

        {/* 线路信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold truncate transition-colors duration-200"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              {route.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-xs"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {route.area}
            </span>
            {hasTopo && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-success) 15%, transparent)',
                  color: 'var(--theme-success)',
                }}
              >
                已标注
              </span>
            )}
          </div>
        </div>

        {/* 难度标签 */}
        <div
          className="px-2.5 py-1 rounded-full text-xs font-bold text-white flex-shrink-0
                     transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundColor: gradeColor,
            boxShadow: `0 2px 8px ${gradeColor}40`,
          }}
        >
          {route.grade}
        </div>

        {/* 箭头指示 */}
        <ChevronRight
          className={`
            w-4 h-4 flex-shrink-0 transition-all duration-300
            ${isSelected ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}
          `}
          style={{ color: 'var(--theme-primary)' }}
        />
      </div>
    </button>
  )
}

/**
 * 进度环组件
 */
function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
}: {
  progress: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--theme-outline-variant)"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--theme-primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color: 'var(--theme-primary)' }}
      >
        {Math.round(progress)}%
      </div>
    </div>
  )
}

/**
 * Topo 线路编辑器 - 重新设计版
 */
export default function TopoEditorPage() {
  // ============ 数据加载状态 ============
  const [crags, setCrags] = useState<Crag[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoadingCrags, setIsLoadingCrags] = useState(true)
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false)

  // ============ 选择状态 ============
  const [selectedCragId, setSelectedCragId] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [showCragDropdown, setShowCragDropdown] = useState(false)

  // ============ 搜索和筛选 ============
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'marked' | 'unmarked'>('all')

  // ============ 编辑状态 ============
  const [editedRoute, setEditedRoute] = useState<Partial<Route>>({})
  const [topoLine, setTopoLine] = useState<TopoPoint[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // ============ 保存状态 ============
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)

  // ============ UI 状态 ============
  const [showEditorPanel, setShowEditorPanel] = useState(false)

  // ============ Refs ============
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const justSavedRef = useRef(false)
  const uploadedTimestampRef = useRef<number | undefined>(undefined)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ============ Toast ============
  const { showToast } = useToast()

  // ============ 加载岩场列表 ============
  useEffect(() => {
    async function loadCrags() {
      try {
        const response = await fetch('/api/crags')
        if (response.ok) {
          const data = await response.json()
          setCrags(data.crags || [])
          // 自动选择第一个岩场
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

  // ============ 加载岩场线路 ============
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

  // ============ 选择线路时初始化编辑状态 ============
  useEffect(() => {
    if (selectedRoute) {
      setEditedRoute({
        name: selectedRoute.name,
        grade: selectedRoute.grade,
        area: selectedRoute.area,
        setter: selectedRoute.setter,
        FA: selectedRoute.FA,
        description: selectedRoute.description,
      })
      setTopoLine(selectedRoute.topoLine || [])
      setUploadedFile(null)
      setShowEditorPanel(true)

      if (justSavedRef.current) {
        justSavedRef.current = false
        return
      }

      const cloudTopoUrl = getRouteTopoUrl(selectedRoute.cragId, selectedRoute.name)
      setImageUrl(cloudTopoUrl)
      setIsImageLoading(true)
      setImageLoadError(false)
    }
  }, [selectedRoute])

  // ============ 筛选后的线路列表 ============
  const filteredRoutes = useMemo(() => {
    let result = routes

    // 搜索筛选 - 复用 App 的拼音搜索算法
    if (searchQuery) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter((r) => {
        // 1. 使用 App 共用的拼音搜索（支持中文/拼音/首字母）
        if (matchRouteByQuery(r, query)) {
          return true
        }
        // 2. 额外支持区域和难度搜索
        if (r.area?.toLowerCase().includes(query)) {
          return true
        }
        if (r.grade.toLowerCase().includes(query)) {
          return true
        }
        return false
      })
    }

    // 标注状态筛选
    if (filterMode === 'marked') {
      result = result.filter((r) => r.topoLine && r.topoLine.length >= 2)
    } else if (filterMode === 'unmarked') {
      result = result.filter((r) => !r.topoLine || r.topoLine.length < 2)
    }

    return result
  }, [routes, searchQuery, filterMode])

  // ============ 统计数据 ============
  const stats = useMemo(() => {
    const marked = routes.filter((r) => r.topoLine && r.topoLine.length >= 2)
    return {
      total: routes.length,
      marked: marked.length,
      unmarked: routes.length - marked.length,
      progress: routes.length > 0 ? (marked.length / routes.length) * 100 : 0,
    }
  }, [routes])

  // ============ 图片处理 ============
  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false)
    setImageLoadError(false)
  }, [])

  const handleImageError = useCallback(() => {
    setIsImageLoading(false)
    setImageLoadError(true)
    setImageUrl(null)
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件')
      return
    }
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setUploadedFile(file)
    setImageLoadError(false)
    setIsImageLoading(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  // ============ 画布点击添加点 ============
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const point = normalizePoint(x, y, rect.width, rect.height)
      setTopoLine((prev) => [...prev, point])
    },
    []
  )

  const handleRemoveLastPoint = useCallback(() => {
    setTopoLine((prev) => prev.slice(0, -1))
  }, [])

  const handleClearPoints = useCallback(() => {
    setTopoLine([])
  }, [])

  // ============ 保存逻辑 ============
  const doUploadAndSave = useCallback(async () => {
    if (!selectedRoute) return

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      let newImageUrl: string | undefined

      if (imageUrl?.startsWith('blob:') && uploadedFile) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', uploadedFile)
        formData.append('cragId', selectedRoute.cragId)
        formData.append('routeName', editedRoute.name || selectedRoute.name)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadRes.json()
        setIsUploading(false)

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || '图片上传失败')
        }

        newImageUrl = uploadData.url
        uploadedTimestampRef.current = Date.now()
      }

      const response = await fetch(`/api/routes/${selectedRoute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editedRoute,
          topoLine: topoLine.length >= 2 ? topoLine : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '保存失败')
      }

      if (newImageUrl) {
        await preloadImage(newImageUrl)
        setImageUrl(newImageUrl)
        setUploadedFile(null)
      }

      setSaveSuccess(true)
      justSavedRef.current = true

      setRoutes((prev) =>
        prev.map((r) => (r.id === selectedRoute.id ? data.route : r))
      )
      setSelectedRoute(data.route)

      const message = newImageUrl
        ? '图片和线路信息保存成功！'
        : '线路信息保存成功！'
      showToast(message, 'success', 3000)

      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '保存失败'
      setSaveError(errorMsg)
      showToast(errorMsg, 'error', 4000)
    } finally {
      setIsSaving(false)
      setIsUploading(false)
    }
  }, [selectedRoute, editedRoute, topoLine, imageUrl, uploadedFile, showToast])

  const handleSave = useCallback(async () => {
    if (!selectedRoute) return

    if (imageUrl?.startsWith('blob:') && uploadedFile) {
      setIsSaving(true)
      setSaveError(null)

      try {
        const checkFormData = new FormData()
        checkFormData.append('cragId', selectedRoute.cragId)
        checkFormData.append('routeName', editedRoute.name || selectedRoute.name)
        checkFormData.append('checkOnly', 'true')

        const checkRes = await fetch('/api/upload', {
          method: 'POST',
          body: checkFormData,
        })

        const checkData = await checkRes.json()

        if (checkData.exists) {
          setIsSaving(false)
          setShowOverwriteConfirm(true)
          return
        }
      } catch {
        // 继续保存
      } finally {
        setIsSaving(false)
      }
    }

    await doUploadAndSave()
  }, [selectedRoute, editedRoute, imageUrl, uploadedFile, doUploadAndSave])

  const handleConfirmOverwrite = useCallback(async () => {
    setShowOverwriteConfirm(false)
    await doUploadAndSave()
  }, [doUploadAndSave])

  const handleCancelOverwrite = useCallback(() => {
    setShowOverwriteConfirm(false)
  }, [])

  // ============ 计算 SVG 路径 ============
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

  const selectedCrag = useMemo(
    () => crags.find((c) => c.id === selectedCragId),
    [crags, selectedCragId]
  )

  // ============ 渲染 ============
  return (
    <div
      className="min-h-screen pb-20"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      {/* ============ 顶部导航栏 ============ */}
      <header
        className="sticky top-0 z-40 px-4 py-3 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-surface) 85%, transparent)',
          borderBottom: '1px solid var(--theme-outline-variant)',
        }}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
            style={{ color: 'var(--theme-primary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </Link>

          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            <h1
              className="text-lg font-bold"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              Topo 编辑器
            </h1>
          </div>

          <div className="w-20" /> {/* 占位保持居中 */}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* ============ 岩场选择器 + 进度 ============ */}
        <div
          className="relative z-20 mb-4 p-4 animate-fade-in-up"
          style={{
            backgroundColor: 'var(--theme-surface-variant)',
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          <div className="flex items-center gap-4">
            {/* 岩场下拉选择 */}
            <div className="flex-1 relative">
              <button
                className="w-full p-3 rounded-xl flex items-center justify-between gap-2 transition-all duration-200 active:scale-[0.99]"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  color: 'var(--theme-on-surface)',
                  boxShadow: 'var(--theme-shadow-sm)',
                }}
                onClick={() => setShowCragDropdown(!showCragDropdown)}
                disabled={isLoadingCrags}
              >
                <div className="flex items-center gap-2">
                  <Mountain className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                  {isLoadingCrags ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      加载中...
                    </span>
                  ) : selectedCrag ? (
                    <span className="font-medium">{selectedCrag.name}</span>
                  ) : (
                    <span style={{ color: 'var(--theme-on-surface-variant)' }}>
                      选择岩场...
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-200 ${
                    showCragDropdown ? 'rotate-180' : ''
                  }`}
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                />
              </button>

              {/* 下拉菜单 */}
              {showCragDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden animate-scale-in"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderRadius: 'var(--theme-radius-xl)',
                    boxShadow: 'var(--theme-shadow-lg)',
                    border: '1px solid var(--theme-outline-variant)',
                  }}
                >
                  {crags.map((crag) => (
                    <button
                      key={crag.id}
                      className="w-full p-3 text-left flex items-center gap-3 transition-all duration-200 hover:bg-opacity-50"
                      style={{
                        color: 'var(--theme-on-surface)',
                        backgroundColor:
                          selectedCragId === crag.id
                            ? 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))'
                            : 'transparent',
                      }}
                      onClick={() => {
                        setSelectedCragId(crag.id)
                        setSelectedRoute(null)
                        setShowCragDropdown(false)
                        setShowEditorPanel(false)
                      }}
                    >
                      <MapPin
                        className="w-4 h-4"
                        style={{
                          color:
                            selectedCragId === crag.id
                              ? 'var(--theme-primary)'
                              : 'var(--theme-on-surface-variant)',
                        }}
                      />
                      <span className={selectedCragId === crag.id ? 'font-medium' : ''}>
                        {crag.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 进度环 */}
            {stats.total > 0 && (
              <div className="flex items-center gap-3">
                <ProgressRing progress={stats.progress} size={52} strokeWidth={5} />
                <div className="text-right">
                  <div
                    className="text-lg font-bold"
                    style={{ color: 'var(--theme-on-surface)' }}
                  >
                    {stats.marked}/{stats.total}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    已标注
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ 搜索和筛选 ============ */}
        {selectedCragId && (
          <div
            className="relative z-10 mb-4 space-y-3 animate-fade-in-up"
            style={{ animationDelay: '50ms' }}
          >
            {/* 搜索框 */}
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜索线路（支持拼音首字母）..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 rounded-xl outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  color: 'var(--theme-on-surface)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all duration-200 active:scale-90"
                  style={{ backgroundColor: 'var(--theme-outline)' }}
                >
                  <X className="w-4 h-4" style={{ color: 'var(--theme-on-surface)' }} />
                </button>
              )}
            </div>

            {/* 筛选标签 */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {[
                { key: 'all' as const, label: '全部', count: stats.total },
                { key: 'unmarked' as const, label: '待标注', count: stats.unmarked },
                { key: 'marked' as const, label: '已标注', count: stats.marked },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterMode(filter.key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor:
                      filterMode === filter.key
                        ? 'var(--theme-primary)'
                        : 'var(--theme-surface-variant)',
                    color:
                      filterMode === filter.key
                        ? 'var(--theme-on-primary)'
                        : 'var(--theme-on-surface)',
                  }}
                >
                  <span className="font-medium">{filter.label}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        filterMode === filter.key
                          ? 'color-mix(in srgb, var(--theme-on-primary) 20%, transparent)'
                          : 'var(--theme-outline-variant)',
                    }}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============ 线路列表 ============ */}
        {selectedCragId && !showEditorPanel && (
          <div
            className="space-y-2 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            {isLoadingRoutes ? (
              <div
                className="flex flex-col items-center justify-center py-12"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <span>加载线路中...</span>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div
                className="text-center py-12"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                {searchQuery || filterMode !== 'all' ? (
                  <>
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">未找到匹配的线路</p>
                    <p className="text-sm mt-1">尝试其他搜索条件</p>
                  </>
                ) : (
                  <>
                    <Mountain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">该岩场暂无线路</p>
                  </>
                )}
              </div>
            ) : (
              filteredRoutes.map((route, index) => (
                <div
                  key={route.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <RouteCard
                    route={route}
                    isSelected={selectedRoute?.id === route.id}
                    onClick={() => setSelectedRoute(route)}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {/* ============ 编辑面板 ============ */}
        {showEditorPanel && selectedRoute && (
          <div className="space-y-4 animate-fade-in-up">
            {/* 返回列表按钮 */}
            <button
              onClick={() => {
                setShowEditorPanel(false)
                setSelectedRoute(null)
              }}
              className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
              style={{ color: 'var(--theme-primary)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">返回线路列表</span>
            </button>

            {/* 当前编辑的线路标题 */}
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
                <h2
                  className="text-lg font-bold"
                  style={{ color: 'var(--theme-on-surface)' }}
                >
                  {selectedRoute.name}
                </h2>
                <p
                  className="text-sm"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {selectedRoute.area} · {selectedRoute.grade}
                </p>
              </div>
              <div
                className="px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: routeColor }}
              >
                {selectedRoute.grade}
              </div>
            </div>

            {/* Topo 编辑区域 */}
            <div
              className="overflow-hidden"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                borderRadius: 'var(--theme-radius-xl)',
              }}
            >
              <div
                className="p-4 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--theme-outline-variant)' }}
              >
                <div>
                  <h3
                    className="font-semibold"
                    style={{ color: 'var(--theme-on-surface)' }}
                  >
                    Topo 标注
                  </h3>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    点击图片添加控制点
                  </p>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    color: 'var(--theme-on-surface)',
                  }}
                >
                  {topoLine.length} 个点
                </div>
              </div>

              {!imageUrl ? (
                <div
                  className={`
                    relative border-2 border-dashed m-4 rounded-xl
                    transition-all duration-200 cursor-pointer
                    flex flex-col items-center justify-center
                    aspect-[4/3]
                  `}
                  style={{
                    borderColor: isDragging
                      ? 'var(--theme-primary)'
                      : imageLoadError
                      ? 'var(--theme-warning)'
                      : 'var(--theme-outline)',
                    backgroundColor: isDragging
                      ? 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface))'
                      : 'var(--theme-surface)',
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imageLoadError ? (
                    <>
                      <AlertCircle
                        className="w-10 h-10 mb-3"
                        style={{ color: 'var(--theme-warning)' }}
                      />
                      <p
                        className="font-medium mb-1"
                        style={{ color: 'var(--theme-on-surface)' }}
                      >
                        云端暂无此线路图片
                      </p>
                      <p
                        className="text-sm text-center px-4"
                        style={{ color: 'var(--theme-on-surface-variant)' }}
                      >
                        请上传图片进行标注
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload
                        className="w-10 h-10 mb-3"
                        style={{ color: 'var(--theme-on-surface-variant)' }}
                      />
                      <p
                        className="font-medium mb-1"
                        style={{ color: 'var(--theme-on-surface)' }}
                      >
                        上传岩石照片
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--theme-on-surface-variant)' }}
                      >
                        拖拽或点击选择
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
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
                      <div
                        className="absolute inset-0 flex items-center justify-center z-10"
                        style={{ backgroundColor: 'var(--theme-surface-variant)' }}
                      >
                        <div className="text-center">
                          <Loader2
                            className="w-8 h-8 animate-spin mx-auto mb-2"
                            style={{ color: 'var(--theme-primary)' }}
                          />
                          <p
                            className="text-sm"
                            style={{ color: 'var(--theme-on-surface-variant)' }}
                          >
                            加载云端图片...
                          </p>
                        </div>
                      </div>
                    )}

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="岩石照片"
                      className="w-full aspect-[4/3] object-cover"
                      style={{ opacity: isImageLoading ? 0 : 1 }}
                      draggable={false}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />

                    {/* SVG 叠加层 */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                      preserveAspectRatio="none"
                    >
                      {pathData && (
                        <path
                          d={pathData}
                          stroke={routeColor}
                          strokeWidth={4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      )}

                      {scaledPoints.map((point, index) => (
                        <g key={index}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={index === 0 ? 10 : index === scaledPoints.length - 1 ? 8 : 6}
                            fill={index === 0 ? routeColor : 'white'}
                            stroke={index === 0 ? 'white' : routeColor}
                            strokeWidth={index === 0 ? 2 : 3}
                          />
                          <text
                            x={point.x}
                            y={point.y + 4}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="bold"
                            fill={index === 0 ? 'white' : routeColor}
                          >
                            {index + 1}
                          </text>
                        </g>
                      ))}

                      {scaledPoints.length > 0 && (
                        <text
                          x={scaledPoints[0].x - 15}
                          y={scaledPoints[0].y + 25}
                          fill={routeColor}
                          fontSize="12"
                          fontWeight="bold"
                        >
                          起点
                        </text>
                      )}
                      {scaledPoints.length > 1 && (
                        <text
                          x={scaledPoints[scaledPoints.length - 1].x - 15}
                          y={scaledPoints[scaledPoints.length - 1].y - 15}
                          fill={routeColor}
                          fontSize="12"
                          fontWeight="bold"
                        >
                          终点
                        </text>
                      )}
                    </svg>

                    {/* 操作提示 */}
                    {uploadedFile && (
                      <div
                        className="absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: 'var(--theme-warning)',
                          color: 'white',
                        }}
                      >
                        待上传
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-4">
                    <button
                      className="flex-1 py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        color: 'var(--theme-on-surface)',
                        boxShadow: 'var(--theme-shadow-sm)',
                      }}
                      onClick={handleRemoveLastPoint}
                      disabled={topoLine.length === 0}
                    >
                      <Trash2 className="w-4 h-4" />
                      撤销
                    </button>
                    <button
                      className="flex-1 py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                      style={{
                        backgroundColor: 'var(--theme-error)',
                        color: 'white',
                        opacity: topoLine.length === 0 ? 0.5 : 1,
                      }}
                      onClick={handleClearPoints}
                      disabled={topoLine.length === 0}
                    >
                      <Trash2 className="w-4 h-4" />
                      清空
                    </button>
                    <button
                      className="py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        color: 'var(--theme-on-surface-variant)',
                        boxShadow: 'var(--theme-shadow-sm)',
                      }}
                      onClick={() => {
                        setImageUrl(null)
                        setUploadedFile(null)
                      }}
                    >
                      换图
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 线路信息编辑 */}
            <div
              className="p-4"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                borderRadius: 'var(--theme-radius-xl)',
              }}
            >
              <h3
                className="font-semibold mb-4"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                线路信息
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    名称 *
                  </label>
                  <input
                    type="text"
                    value={editedRoute.name || ''}
                    onChange={(e) =>
                      setEditedRoute((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      color: 'var(--theme-on-surface)',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    难度
                  </label>
                  <select
                    value={editedRoute.grade || ''}
                    onChange={(e) =>
                      setEditedRoute((prev) => ({ ...prev, grade: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      color: 'var(--theme-on-surface)',
                    }}
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    区域
                  </label>
                  <input
                    type="text"
                    value={editedRoute.area || ''}
                    onChange={(e) =>
                      setEditedRoute((prev) => ({ ...prev, area: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      color: 'var(--theme-on-surface)',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    首攀者 (FA)
                  </label>
                  <input
                    type="text"
                    value={editedRoute.FA || ''}
                    onChange={(e) =>
                      setEditedRoute((prev) => ({ ...prev, FA: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      color: 'var(--theme-on-surface)',
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    定线者
                  </label>
                  <input
                    type="text"
                    value={editedRoute.setter || ''}
                    onChange={(e) =>
                      setEditedRoute((prev) => ({ ...prev, setter: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      color: 'var(--theme-on-surface)',
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    描述
                  </label>
                  <textarea
                    value={editedRoute.description || ''}
                    onChange={(e) =>
                      setEditedRoute((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm resize-none outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      color: 'var(--theme-on-surface)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <button
              className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: saveSuccess
                  ? 'var(--theme-success)'
                  : 'var(--theme-primary)',
                color: saveSuccess ? 'white' : 'var(--theme-on-primary)',
                boxShadow: `0 4px 16px ${saveSuccess ? 'var(--theme-success)' : 'var(--theme-primary)'}40`,
                opacity: isSaving ? 0.8 : 1,
              }}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  上传图片中...
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  保存中...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  保存成功
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  保存更改
                </>
              )}
            </button>

            {/* 错误提示 */}
            {saveError && (
              <div
                className="p-3 rounded-xl flex items-center gap-2 animate-fade-in-up"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-error) 12%, var(--theme-surface))',
                  color: 'var(--theme-error)',
                }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{saveError}</span>
              </div>
            )}
          </div>
        )}

        {/* 未选择岩场时的空状态 */}
        {!selectedCragId && !isLoadingCrags && (
          <div
            className="text-center py-16 animate-fade-in-up"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            <Mountain className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">选择一个岩场开始编辑</p>
            <p className="text-sm">从上方下拉菜单选择岩场</p>
          </div>
        )}
      </div>

      {/* 覆盖确认对话框 */}
      {showOverwriteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div
            className="max-w-sm w-full p-6 animate-scale-in"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderRadius: 'var(--theme-radius-xl)',
              boxShadow: 'var(--theme-shadow-lg)',
            }}
          >
            <div className="flex items-start gap-4 mb-5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-warning) 15%, var(--theme-surface))',
                }}
              >
                <AlertCircle
                  className="w-6 h-6"
                  style={{ color: 'var(--theme-warning)' }}
                />
              </div>
              <div>
                <h3
                  className="font-bold text-lg mb-1"
                  style={{ color: 'var(--theme-on-surface)' }}
                >
                  覆盖确认
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  该线路已有云端图片，上传新图片将覆盖原有图片。确定要继续吗？
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  color: 'var(--theme-on-surface)',
                }}
                onClick={handleCancelOverwrite}
              >
                取消
              </button>
              <button
                className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--theme-warning)',
                  color: 'white',
                }}
                onClick={handleConfirmOverwrite}
              >
                确认覆盖
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部导航栏 */}
      <AppTabbar />
    </div>
  )
}
