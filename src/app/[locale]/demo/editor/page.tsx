'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  Upload,
  Trash2,
  Save,
  ArrowLeft,
  Check,
  ChevronDown,
  MapPin,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { AppTabbar } from '@/components/app-tabbar'
import type { Route, Crag, TopoPoint } from '@/types'
import { bezierCurve, scalePoints, normalizePoint } from '@/lib/topo-utils'
import { getGradeColor } from '@/lib/tokens'
import { getRouteTopoUrl } from '@/lib/constants'
import { useToast } from '@/components/ui/toast'

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
 * 用于上传后等待 CDN 传播完成
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url

    // 超时保护 (10秒) - CDN 传播可能需要几秒
    setTimeout(() => resolve(), 10000)
  })
}

/**
 * Topo 线路编辑器 - 完整版
 *
 * 功能：
 * 1. 选择岩场和线路
 * 2. 上传/使用岩场图片
 * 3. 编辑线路 Topo 标注
 * 4. 编辑线路基本信息
 * 5. 保存到数据库
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

  // ============ 编辑状态 ============
  const [editedRoute, setEditedRoute] = useState<Partial<Route>>({})
  const [topoLine, setTopoLine] = useState<TopoPoint[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null) // 保存本地上传的文件
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false) // 图片上传中状态

  // ============ 保存状态 ============
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false) // 覆盖确认对话框

  // ============ Refs ============
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const justSavedRef = useRef(false)           // 标记刚完成保存，防止 useEffect 重置图片 URL
  const uploadedTimestampRef = useRef<number | undefined>(undefined) // 保存上传时间戳

  // ============ Toast ============
  const { showToast } = useToast()

  // ============ 加载岩场列表 ============
  useEffect(() => {
    async function loadCrags() {
      try {
        // 使用 Server Action 或直接调用数据库
        const response = await fetch('/api/crags')
        if (response.ok) {
          const data = await response.json()
          setCrags(data.crags || [])
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
      setUploadedFile(null) // 清除之前上传的文件

      // 如果刚完成保存，跳过图片 URL 重置（保留带时间戳的新 URL）
      if (justSavedRef.current) {
        justSavedRef.current = false
        return
      }

      // 正常情况：加载云端 Topo 图
      // 优先使用云端图片 URL: https://img.bouldering.top/{cragId}/{routeName}.jpg
      const cloudTopoUrl = getRouteTopoUrl(selectedRoute.cragId, selectedRoute.name)
      setImageUrl(cloudTopoUrl)
      setIsImageLoading(true)
      setImageLoadError(false)
    }
  }, [selectedRoute])

  // ============ 图片加载状态处理 ============
  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false)
    setImageLoadError(false)
  }, [])

  const handleImageError = useCallback(() => {
    setIsImageLoading(false)
    setImageLoadError(true)
    // 云端图片加载失败，清空 URL 显示上传区域
    setImageUrl(null)
  }, [])

  // ============ 文件上传处理 ============
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件')
      return
    }
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setUploadedFile(file) // 保存原始文件用于上传
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

  // ============ 删除点 ============
  const handleRemoveLastPoint = useCallback(() => {
    setTopoLine((prev) => prev.slice(0, -1))
  }, [])

  const handleClearPoints = useCallback(() => {
    setTopoLine([])
  }, [])

  // ============ 执行实际的上传和保存操作 ============
  const doUploadAndSave = useCallback(async () => {
    if (!selectedRoute) return

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      let newImageUrl: string | undefined

      // 步骤 1: 如果是本地上传的新图片，上传到 R2
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

        // 保存带时间戳的新 URL
        newImageUrl = uploadData.url
        uploadedTimestampRef.current = Date.now()
      }

      // 步骤 2: 保存线路数据到数据库
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

      // 步骤 3: 预加载验证新图片（如果有上传）
      if (newImageUrl) {
        await preloadImage(newImageUrl)
        setImageUrl(newImageUrl)
        setUploadedFile(null)
      }

      // 步骤 4: 更新状态
      setSaveSuccess(true)
      justSavedRef.current = true  // 标记刚完成保存，防止 useEffect 重置图片 URL

      setRoutes((prev) =>
        prev.map((r) => (r.id === selectedRoute.id ? data.route : r))
      )
      setSelectedRoute(data.route)

      // 步骤 5: 显示成功 Toast
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

  // ============ 保存按钮点击处理 ============
  const handleSave = useCallback(async () => {
    if (!selectedRoute) return

    // 如果有新上传的本地图片，先检查 R2 是否已存在
    if (imageUrl?.startsWith('blob:') && uploadedFile) {
      setIsSaving(true)
      setSaveError(null)

      try {
        // 使用 checkOnly 模式检查是否已存在
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
          // 文件已存在，显示覆盖确认对话框
          setIsSaving(false)
          setShowOverwriteConfirm(true)
          return // 等待用户确认
        }
      } catch {
        // 检查失败，继续保存（不阻塞）
      } finally {
        setIsSaving(false)
      }
    }

    // 直接执行保存
    await doUploadAndSave()
  }, [selectedRoute, editedRoute, imageUrl, uploadedFile, doUploadAndSave])

  // ============ 确认覆盖后的处理 ============
  const handleConfirmOverwrite = useCallback(async () => {
    setShowOverwriteConfirm(false)
    await doUploadAndSave()
  }, [doUploadAndSave])

  // ============ 取消覆盖 ============
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

  // ============ 选中的岩场 ============
  const selectedCrag = useMemo(
    () => crags.find((c) => c.id === selectedCragId),
    [crags, selectedCragId]
  )

  // ============ 已标注/未标注线路统计 ============
  const routeStats = useMemo(() => {
    const marked = routes.filter((r) => r.topoLine && r.topoLine.length >= 2)
    return {
      total: routes.length,
      marked: marked.length,
      unmarked: routes.length - marked.length,
    }
  }, [routes])

  // ============ 渲染 ============
  return (
    <div
      className="min-h-screen p-4 pb-24"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      {/* 头部导航 */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-4 text-sm"
          style={{ color: 'var(--theme-primary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          Topo 线路编辑器
        </h1>
        <p
          className="text-sm"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          选择岩场和线路，编辑 Topo 标注和线路信息，保存到数据库。
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：岩场和线路选择 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 岩场选择器 */}
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          >
            <h3
              className="font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              <MapPin className="w-4 h-4" />
              选择岩场
            </h3>

            <div className="relative">
              <button
                className="w-full p-3 rounded-lg text-left flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  color: 'var(--theme-on-surface)',
                  border: '1px solid var(--theme-outline)',
                }}
                onClick={() => setShowCragDropdown(!showCragDropdown)}
                disabled={isLoadingCrags}
              >
                {isLoadingCrags ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    加载中...
                  </span>
                ) : selectedCrag ? (
                  selectedCrag.name
                ) : (
                  '选择岩场...'
                )}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showCragDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-10 max-h-60 overflow-auto"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    border: '1px solid var(--theme-outline)',
                  }}
                >
                  {crags.map((crag) => (
                    <button
                      key={crag.id}
                      className="w-full p-3 text-left hover:opacity-80 transition-opacity"
                      style={{
                        color: 'var(--theme-on-surface)',
                        backgroundColor:
                          selectedCragId === crag.id
                            ? 'var(--theme-primary-container)'
                            : 'transparent',
                      }}
                      onClick={() => {
                        setSelectedCragId(crag.id)
                        setSelectedRoute(null)
                        setShowCragDropdown(false)
                      }}
                    >
                      {crag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 线路列表 */}
          {selectedCragId && (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            >
              <h3
                className="font-semibold mb-2"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                线路列表
              </h3>
              <p
                className="text-xs mb-3"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                已标注 {routeStats.marked} / {routeStats.total} 条线路
              </p>

              {isLoadingRoutes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    className="w-6 h-6 animate-spin"
                    style={{ color: 'var(--theme-primary)' }}
                  />
                </div>
              ) : routes.length === 0 ? (
                <p
                  className="text-sm text-center py-4"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  该岩场暂无线路
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {routes.map((route) => {
                    const hasTopo = route.topoLine && route.topoLine.length >= 2
                    const isSelected = selectedRoute?.id === route.id
                    return (
                      <button
                        key={route.id}
                        className="w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all"
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--theme-primary-container)'
                            : 'var(--theme-surface)',
                          border: isSelected
                            ? `2px solid ${getGradeColor(route.grade)}`
                            : '1px solid var(--theme-outline-variant)',
                        }}
                        onClick={() => setSelectedRoute(route)}
                      >
                        {/* 标注状态 */}
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: hasTopo
                              ? 'var(--theme-success)'
                              : 'var(--theme-outline)',
                          }}
                        >
                          {hasTopo ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <span className="text-xs text-white">?</span>
                          )}
                        </div>

                        {/* 线路信息 */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-medium truncate"
                            style={{ color: 'var(--theme-on-surface)' }}
                          >
                            {route.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: 'var(--theme-on-surface-variant)' }}
                          >
                            {route.area}
                          </p>
                        </div>

                        {/* 难度 */}
                        <span
                          className="px-2 py-1 rounded text-xs font-mono text-white"
                          style={{ backgroundColor: getGradeColor(route.grade) }}
                        >
                          {route.grade}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧：编辑区域 */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedRoute ? (
            // 未选择线路时的提示
            <div
              className="p-8 rounded-xl text-center"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            >
              <MapPin
                className="w-12 h-12 mx-auto mb-4"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              />
              <p
                className="text-lg font-medium mb-2"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                选择一条线路开始编辑
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                从左侧列表选择岩场和线路，或上传新图片进行标注
              </p>
            </div>
          ) : (
            <>
              {/* Topo 编辑区域 */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--theme-surface-variant)' }}
              >
                <div className="p-4 border-b" style={{ borderColor: 'var(--theme-outline)' }}>
                  <h3
                    className="font-semibold"
                    style={{ color: 'var(--theme-on-surface)' }}
                  >
                    Topo 标注
                  </h3>
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    点击图片添加控制点，从起点到终点依次添加
                  </p>
                </div>

                {!imageUrl ? (
                  // 图片上传区域
                  <div
                    className={`
                      relative border-2 border-dashed m-4 rounded-lg
                      transition-all cursor-pointer
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
                        ? 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))'
                        : 'var(--theme-surface)',
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imageLoadError ? (
                      // 云端图片不存在
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
                      // 正常上传提示
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
                  // 画布编辑区域
                  <div className="p-4">
                    <div
                      ref={containerRef}
                      className="relative rounded-lg overflow-hidden cursor-crosshair"
                      style={{ boxShadow: 'var(--theme-shadow-md)' }}
                      onClick={handleCanvasClick}
                    >
                      {/* 加载中状态 */}
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
                      <div className="absolute top-3 left-3 flex gap-2">
                        <div
                          className="px-3 py-1 rounded-full text-sm"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                          }}
                        >
                          已添加 {topoLine.length} 个点
                        </div>
                        {/* 图片来源标签 */}
                        {uploadedFile && (
                          <div
                            className="px-3 py-1 rounded-full text-sm"
                            style={{
                              backgroundColor: 'var(--theme-warning)',
                              color: 'white',
                            }}
                          >
                            待上传
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 mt-4">
                      <button
                        className="flex-1 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: 'var(--theme-surface)',
                          color: 'var(--theme-on-surface)',
                          border: '1px solid var(--theme-outline)',
                        }}
                        onClick={handleRemoveLastPoint}
                        disabled={topoLine.length === 0}
                      >
                        <Trash2 className="w-4 h-4" />
                        撤销
                      </button>
                      <button
                        className="flex-1 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
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
                        className="py-2 px-4 rounded-lg font-medium"
                        style={{
                          backgroundColor: 'var(--theme-surface)',
                          color: 'var(--theme-on-surface-variant)',
                          border: '1px solid var(--theme-outline)',
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
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'var(--theme-surface-variant)' }}
              >
                <h3
                  className="font-semibold mb-4"
                  style={{ color: 'var(--theme-on-surface)' }}
                >
                  线路信息
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* 名称 */}
                  <div>
                    <label
                      className="block text-sm mb-1"
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
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        color: 'var(--theme-on-surface)',
                        border: '1px solid var(--theme-outline)',
                      }}
                    />
                  </div>

                  {/* 难度 */}
                  <div>
                    <label
                      className="block text-sm mb-1"
                      style={{ color: 'var(--theme-on-surface-variant)' }}
                    >
                      难度
                    </label>
                    <select
                      value={editedRoute.grade || ''}
                      onChange={(e) =>
                        setEditedRoute((prev) => ({ ...prev, grade: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        color: 'var(--theme-on-surface)',
                        border: '1px solid var(--theme-outline)',
                      }}
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 区域 */}
                  <div>
                    <label
                      className="block text-sm mb-1"
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
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        color: 'var(--theme-on-surface)',
                        border: '1px solid var(--theme-outline)',
                      }}
                    />
                  </div>

                  {/* FA */}
                  <div>
                    <label
                      className="block text-sm mb-1"
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
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        color: 'var(--theme-on-surface)',
                        border: '1px solid var(--theme-outline)',
                      }}
                    />
                  </div>

                  {/* 定线者 */}
                  <div className="col-span-2">
                    <label
                      className="block text-sm mb-1"
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
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        color: 'var(--theme-on-surface)',
                        border: '1px solid var(--theme-outline)',
                      }}
                    />
                  </div>

                  {/* 描述 */}
                  <div className="col-span-2">
                    <label
                      className="block text-sm mb-1"
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
                      className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        color: 'var(--theme-on-surface)',
                        border: '1px solid var(--theme-outline)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 保存按钮 */}
              <div className="flex items-center gap-4">
                <button
                  className="flex-1 py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                  style={{
                    backgroundColor: saveSuccess
                      ? 'var(--theme-success)'
                      : 'var(--theme-primary)',
                    color: 'white',
                    opacity: isSaving ? 0.7 : 1,
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
                      已保存
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      保存更改
                    </>
                  )}
                </button>
              </div>

              {/* 错误提示 */}
              {saveError && (
                <div
                  className="p-3 rounded-lg flex items-center gap-2"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-error) 15%, var(--theme-surface))',
                    color: 'var(--theme-error)',
                  }}
                >
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{saveError}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 覆盖确认对话框 */}
      {showOverwriteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="max-w-sm w-full p-6 rounded-2xl animate-scale-in"
            style={{
              backgroundColor: 'var(--theme-surface)',
              boxShadow: 'var(--theme-shadow-lg)',
            }}
          >
            <div className="flex items-start gap-4 mb-4">
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
                  className="font-semibold text-lg mb-1"
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
                className="flex-1 py-2.5 px-4 rounded-xl font-medium"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  color: 'var(--theme-on-surface)',
                }}
                onClick={handleCancelOverwrite}
              >
                取消
              </button>
              <button
                className="flex-1 py-2.5 px-4 rounded-xl font-medium"
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
