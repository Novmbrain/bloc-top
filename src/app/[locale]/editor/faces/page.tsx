'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  ArrowLeft,
  Upload,
  AlertCircle,
  Loader2,
  X,
  Mountain,
  Image as ImageIcon,
  Plus,
  Layers,
  Trash2,
  Pencil,
  Check,
  RefreshCw,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { AppTabbar } from '@/components/app-tabbar'
import type { Route } from '@/types'
import { getFaceTopoUrl } from '@/lib/constants'
import { useToast } from '@/components/ui/toast'
import { useCragRoutes } from '@/hooks/use-crag-routes'
import { CragSelector } from '@/components/editor/crag-selector'
import { preloadImage } from '@/lib/editor-utils'

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

/**
 * 岩面缩略图 - 独立管理加载/错误状态，支持重试
 */
function FaceThumbnail({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <>
      {status === 'loading' && (
        <div className="w-full h-full skeleton-shimmer" />
      )}
      {status === 'error' && (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          <ImageIcon className="w-5 h-5 opacity-40" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${status === 'loaded' ? '' : 'hidden'}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </>
  )
}

/**
 * 岩面管理页面
 * 选 crag → 选/建 area → 创建 faceId → 上传照片
 */
export default function FaceManagementPage() {
  const {
    crags, routes, selectedCragId, setSelectedCragId,
    isLoadingCrags, isLoadingRoutes, stats,
  } = useCragRoutes()

  // ============ R2 上已有的 face 列表 ============
  const [r2Faces, setR2Faces] = useState<R2FaceInfo[]>([])
  const [isLoadingFaces, setIsLoadingFaces] = useState(false)

  // ============ 选择状态 ============
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedFace, setSelectedFace] = useState<FaceGroup | null>(null)

  // ============ 新建模式 ============
  const [isCreating, setIsCreating] = useState(false)

  // ============ 移动端视图切换 ============
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const [newFaceId, setNewFaceId] = useState('')
  const [newArea, setNewArea] = useState('')
  const [customArea, setCustomArea] = useState('')

  // ============ 上传状态 ============
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [isSubmittingRename, setIsSubmittingRename] = useState(false)

  // ============ Refs ============
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============ Toast ============
  const { showToast } = useToast()

  // ============ 从 R2 加载岩面列表 ============
  const loadFaces = useCallback((cragId: string) => {
    setIsLoadingFaces(true)
    return fetch(`/api/faces?cragId=${encodeURIComponent(cragId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setR2Faces(data.faces as R2FaceInfo[])
      })
      .catch(() => { /* 静默失败，回退到仅 route 派生 */ })
      .finally(() => setIsLoadingFaces(false))
  }, [])

  useEffect(() => {
    if (!selectedCragId) {
      setR2Faces([])
      return
    }
    let cancelled = false
    loadFaces(selectedCragId).then(() => { if (cancelled) return })
    return () => { cancelled = true }
  }, [selectedCragId, loadFaces])

  // 刷新岩面列表
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = useCallback(async () => {
    if (!selectedCragId || isRefreshing) return
    setIsRefreshing(true)
    await loadFaces(selectedCragId)
    setIsRefreshing(false)
    showToast('已刷新', 'success', 2000)
  }, [selectedCragId, isRefreshing, loadFaces, showToast])

  // ============ 桌面端突破 app-shell 宽度限制 ============
  useEffect(() => {
    const shell = document.getElementById('app-shell')
    if (!shell) return
    const original = shell.style.maxWidth
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const update = (mq: MediaQueryList | MediaQueryListEvent) => {
      shell.style.maxWidth = mq.matches ? 'none' : original
    }
    update(mediaQuery)
    mediaQuery.addEventListener('change', update)
    return () => {
      mediaQuery.removeEventListener('change', update)
      shell.style.maxWidth = original
    }
  }, [])

  // ============ 派生数据 ============
  const areas = useMemo(() =>
    [...new Set(routes.map(r => r.area).filter(Boolean))].sort()
  , [routes])

  const faceGroups = useMemo(() => {
    if (!selectedCragId) return []
    const map = new Map<string, FaceGroup>()

    // 从 R2 数据构建 face 列表（每个 face 自带 area）
    r2Faces.forEach(({ faceId, area }) => {
      map.set(faceId, {
        faceId,
        area,
        routes: [],
        imageUrl: getFaceTopoUrl(selectedCragId, area, faceId),
      })
    })

    // 关联 routes 到对应的 face
    routes.forEach(r => {
      if (!r.faceId) return
      const entry = map.get(r.faceId)
      if (entry) entry.routes.push(r)
    })

    let result = Array.from(map.values())
    if (selectedArea) result = result.filter(f => f.area === selectedArea)
    return result
  }, [routes, r2Faces, selectedCragId, selectedArea])

  // 切换岩场时重置选择
  const handleSelectCrag = useCallback((id: string) => {
    setSelectedCragId(id)
    setSelectedFace(null)
    setIsCreating(false)
    setSelectedArea(null)
    setMobileShowDetail(false)
  }, [setSelectedCragId])

  // ============ 文件处理 ============
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error')
      return
    }
    const url = URL.createObjectURL(file)
    setUploadedFile(file)
    setPreviewUrl(url)
  }, [showToast])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  // ============ 上传逻辑 ============
  const doUpload = useCallback(async () => {
    if (!uploadedFile || !selectedCragId) return

    const faceId = isCreating ? newFaceId : selectedFace?.faceId
    if (!faceId) return

    // 确定 area：新建时从表单获取；替换时从已选 face 获取
    const uploadArea = isCreating
      ? (newArea === '__custom__' ? customArea : newArea)
      : selectedFace?.area
    if (!uploadArea) {
      showToast('请选择区域', 'error')
      setIsUploading(false)
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('cragId', selectedCragId)
      formData.append('faceId', faceId)
      formData.append('area', uploadArea)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || '上传失败')

      await preloadImage(data.url)
      showToast('照片上传成功！', 'success', 3000)
      setUploadedFile(null)
      setPreviewUrl(null)

      if (isCreating) {
        // 将新上传的 faceId 加入 R2 列表使其立即可见
        const area = newArea === '__custom__' ? customArea : newArea
        setR2Faces(prev => prev.some(f => f.faceId === faceId) ? prev : [...prev, { faceId, area }])
        const newFace: FaceGroup = {
          faceId,
          area: area || '',
          routes: [],
          imageUrl: data.url,
        }
        setSelectedFace(newFace)
        setIsCreating(false)
        setNewFaceId('')
        setNewArea('')
        setCustomArea('')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '上传失败'
      showToast(msg, 'error', 4000)
    } finally {
      setIsUploading(false)
    }
  }, [uploadedFile, selectedCragId, isCreating, newFaceId, selectedFace, showToast])

  const handleUpload = useCallback(async () => {
    if (!uploadedFile || !selectedCragId) return

    const faceId = isCreating ? newFaceId : selectedFace?.faceId
    if (!faceId) return

    // 检查是否已存在
    const checkArea = isCreating
      ? (newArea === '__custom__' ? customArea : newArea)
      : selectedFace?.area
    try {
      const checkFormData = new FormData()
      checkFormData.append('cragId', selectedCragId)
      checkFormData.append('faceId', faceId)
      if (checkArea) checkFormData.append('area', checkArea)
      checkFormData.append('checkOnly', 'true')

      const checkRes = await fetch('/api/upload', { method: 'POST', body: checkFormData })
      const checkData = await checkRes.json()

      if (checkData.exists) {
        setShowOverwriteConfirm(true)
        return
      }
    } catch {
      // 继续上传
    }

    await doUpload()
  }, [uploadedFile, selectedCragId, isCreating, newFaceId, selectedFace, doUpload])

  // ============ 删除岩面 ============
  const handleDeleteFace = useCallback(async () => {
    if (!selectedFace || !selectedCragId) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/faces', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cragId: selectedCragId,
          area: selectedFace.area,
          faceId: selectedFace.faceId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '删除失败')

      // 从本地状态移除
      setR2Faces(prev => prev.filter(f => f.faceId !== selectedFace.faceId))
      setSelectedFace(null)
      setMobileShowDetail(false)
      setShowDeleteConfirm(false)

      const msg = data.routesCleared > 0
        ? `岩面已删除，已清除 ${data.routesCleared} 条线路的关联`
        : '岩面已删除'
      showToast(msg, 'success', 3000)
    } catch (error) {
      const msg = error instanceof Error ? error.message : '删除失败'
      showToast(msg, 'error', 4000)
    } finally {
      setIsDeleting(false)
    }
  }, [selectedFace, selectedCragId, showToast])

  // ============ 重命名岩面 ============
  const handleRenameFace = useCallback(async () => {
    if (!selectedFace || !selectedCragId || !renameValue) return
    const newFaceId = renameValue.trim()
    if (!newFaceId || newFaceId === selectedFace.faceId) {
      setIsRenaming(false)
      return
    }
    if (!/^[\u4e00-\u9fffa-z0-9-]+$/.test(newFaceId)) {
      showToast('名称只允许中文、小写字母、数字和连字符', 'error')
      return
    }
    setIsSubmittingRename(true)
    try {
      const res = await fetch('/api/faces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cragId: selectedCragId,
          area: selectedFace.area,
          oldFaceId: selectedFace.faceId,
          newFaceId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '重命名失败')

      // 更新本地状态
      setR2Faces(prev => prev.map(f =>
        f.faceId === selectedFace.faceId ? { ...f, faceId: newFaceId } : f
      ))
      setSelectedFace(prev => prev ? {
        ...prev,
        faceId: newFaceId,
        imageUrl: getFaceTopoUrl(selectedCragId, prev.area, newFaceId),
      } : null)
      setIsRenaming(false)

      const msg = data.routesUpdated > 0
        ? `已重命名，${data.routesUpdated} 条线路已更新`
        : '岩面已重命名'
      showToast(msg, 'success', 3000)
    } catch (error) {
      const msg = error instanceof Error ? error.message : '重命名失败'
      showToast(msg, 'error', 4000)
    } finally {
      setIsSubmittingRename(false)
    }
  }, [selectedFace, selectedCragId, renameValue, showToast])

  // ============ 左栏：岩面列表 ============
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
          {/* Area 筛选 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3 px-1">
            <button
              onClick={() => setSelectedArea(null)}
              className="px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 text-sm font-medium"
              style={{
                backgroundColor: !selectedArea ? 'var(--theme-primary)' : 'var(--theme-surface-variant)',
                color: !selectedArea ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)',
              }}
            >
              全部
            </button>
            {areas.map(area => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className="px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 text-sm font-medium"
                style={{
                  backgroundColor: selectedArea === area ? 'var(--theme-primary)' : 'var(--theme-surface-variant)',
                  color: selectedArea === area ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)',
                }}
              >
                {area}
              </button>
            ))}
          </div>

          {/* 岩面列表 */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {isLoadingRoutes || isLoadingFaces ? (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <span>加载中...</span>
              </div>
            ) : faceGroups.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">暂无岩面</p>
                <p className="text-sm mt-1">点击下方按钮新建岩面</p>
              </div>
            ) : (
              faceGroups.map(face => (
                <button
                  key={face.faceId}
                  onClick={() => { setSelectedFace(face); setIsCreating(false); setIsRenaming(false); setMobileShowDetail(true) }}
                  className={`
                    w-full text-left p-3 transition-all duration-200 active:scale-[0.98]
                    ${selectedFace?.faceId === face.faceId && !isCreating ? 'ring-2' : ''}
                  `}
                  style={{
                    backgroundColor: selectedFace?.faceId === face.faceId && !isCreating
                      ? 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))'
                      : 'var(--theme-surface)',
                    borderRadius: 'var(--theme-radius-xl)',
                    boxShadow: 'var(--theme-shadow-sm)',
                    // @ts-expect-error -- CSS custom properties
                    '--tw-ring-color': 'var(--theme-primary)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* 缩略图 */}
                    <div
                      className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: 'var(--theme-surface-variant)' }}
                    >
                      <FaceThumbnail src={face.imageUrl} alt={face.faceId} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold block truncate" style={{ color: 'var(--theme-on-surface)' }}>
                        {face.faceId}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                        {face.area} · {face.routes.length} 条线路
                      </span>
                    </div>
                    <Layers className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--theme-on-surface-variant)' }} />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* 新建按钮 */}
          <button
            onClick={() => { setIsCreating(true); setSelectedFace(null); setMobileShowDetail(true) }}
            className="w-full mt-3 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: isCreating ? 'var(--theme-primary)' : 'var(--theme-surface-variant)',
              color: isCreating ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)',
            }}
          >
            <Plus className="w-5 h-5" />
            新建岩面
          </button>
        </>
      )}
    </div>
  )

  // ============ 右栏：详情/新建 ============
  const canCreate = isCreating && newFaceId && /^[\u4e00-\u9fffa-z0-9-]+$/.test(newFaceId) && uploadedFile

  const rightPanel = (
    <div className="h-full overflow-y-auto">
      {!selectedCragId ? (
        <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-on-surface-variant)' }}>
          <Mountain className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">选择岩场开始管理岩面</p>
        </div>
      ) : isCreating ? (
        /* 新建岩面 */
        <div className="space-y-4 animate-fade-in-up">
          <div className="p-4" style={{ backgroundColor: 'var(--theme-surface-variant)', borderRadius: 'var(--theme-radius-xl)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--theme-on-surface)' }}>新建岩面</h3>

            {/* Area 选择 */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
                区域 (Area)
              </label>
              <select
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
              >
                <option value="">选择区域...</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
                <option value="__custom__">+ 新增区域</option>
              </select>
              {newArea === '__custom__' && (
                <input
                  type="text"
                  placeholder="输入新区域名称"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  className="w-full mt-2 px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                  style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
                />
              )}
            </div>

            {/* FaceId 输入 */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
                岩面 ID (faceId)
              </label>
              <input
                type="text"
                placeholder="如 主墙-1 或 main-wall-1"
                value={newFaceId}
                onChange={(e) => setNewFaceId(e.target.value.toLowerCase().replace(/[^\u4e00-\u9fffa-z0-9-]/g, ''))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
              />
              {newFaceId && !/^[\u4e00-\u9fffa-z0-9-]+$/.test(newFaceId) && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--theme-error)' }}>
                  只允许中文、小写字母、数字和连字符
                </p>
              )}
              {newFaceId && faceGroups.some(f => f.faceId === newFaceId) && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--theme-warning)' }}>
                  该 ID 已存在，上传将覆盖现有照片
                </p>
              )}
            </div>
          </div>

          {/* 图片上传区 */}
          <div className="p-4" style={{ backgroundColor: 'var(--theme-surface-variant)', borderRadius: 'var(--theme-radius-xl)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--theme-on-surface)' }}>岩面照片</h3>
            {!previewUrl ? (
              <div
                className={`relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center aspect-[4/3]`}
                style={{
                  borderColor: isDragging ? 'var(--theme-primary)' : 'var(--theme-outline)',
                  backgroundColor: isDragging ? 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface))' : 'var(--theme-surface)',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 mb-3" style={{ color: 'var(--theme-on-surface-variant)' }} />
                <p className="font-medium mb-1" style={{ color: 'var(--theme-on-surface)' }}>上传岩面照片</p>
                <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>拖拽或点击选择</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>
            ) : (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="预览" className="w-full aspect-[4/3] object-cover rounded-xl" />
                <button
                  onClick={() => { setUploadedFile(null); setPreviewUrl(null) }}
                  className="absolute top-2 right-2 p-2 rounded-full transition-all active:scale-90"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* 创建按钮 */}
          <button
            onClick={handleUpload}
            disabled={!canCreate || isUploading}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
              opacity: !canCreate || isUploading ? 0.5 : 1,
            }}
          >
            {isUploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 上传中...</>
            ) : (
              <><Upload className="w-5 h-5" /> 创建岩面</>
            )}
          </button>
        </div>
      ) : selectedFace ? (
        /* 查看已有岩面 */
        <div className="space-y-4 animate-fade-in-up">
          {/* 大图预览 */}
          <div className="aspect-[4/3]" style={{ borderRadius: 'var(--theme-radius-xl)', overflow: 'hidden', backgroundColor: 'var(--theme-surface-variant)' }}>
            <FaceThumbnail src={selectedFace.imageUrl} alt={selectedFace.faceId} />
          </div>

          {/* 岩面信息 */}
          <div className="p-4" style={{ backgroundColor: 'var(--theme-surface-variant)', borderRadius: 'var(--theme-radius-xl)' }}>
            <div className="flex items-center justify-between mb-3 gap-2">
              {isRenaming ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value.toLowerCase().replace(/[^\u4e00-\u9fffa-z0-9-]/g, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFace(); if (e.key === 'Escape') setIsRenaming(false) }}
                    autoFocus
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
                    disabled={isSubmittingRename}
                  />
                  <button
                    onClick={handleRenameFace}
                    disabled={isSubmittingRename || !renameValue.trim()}
                    className="p-1.5 rounded-lg transition-all active:scale-90"
                    style={{ color: 'var(--theme-primary)' }}
                  >
                    {isSubmittingRename ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsRenaming(false)}
                    disabled={isSubmittingRename}
                    className="p-1.5 rounded-lg transition-all active:scale-90"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="font-semibold truncate" style={{ color: 'var(--theme-on-surface)' }}>
                    {selectedFace.faceId}
                  </h3>
                  <button
                    onClick={() => { setIsRenaming(true); setRenameValue(selectedFace.faceId) }}
                    className="p-1.5 rounded-lg transition-all active:scale-90 flex-shrink-0"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                    title="重命名"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <span className="text-sm px-3 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface-variant)' }}>
                {selectedFace.area}
              </span>
            </div>

            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--theme-on-surface-variant)' }}>
              关联线路 ({selectedFace.routes.length})
            </h4>
            <div className="space-y-1.5">
              {selectedFace.routes.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--theme-surface)' }}
                >
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--theme-on-surface)' }}>{r.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>
                    {r.grade}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 删除岩面 */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-error) 12%, var(--theme-surface))',
              color: 'var(--theme-error)',
            }}
          >
            <Trash2 className="w-4 h-4" />
            删除岩面
          </button>

          {/* 更换照片 */}
          <div className="p-4" style={{ backgroundColor: 'var(--theme-surface-variant)', borderRadius: 'var(--theme-radius-xl)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--theme-on-surface)' }}>更换照片</h3>
            {!previewUrl ? (
              <div
                className="border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center py-8"
                style={{
                  borderColor: isDragging ? 'var(--theme-primary)' : 'var(--theme-outline)',
                  backgroundColor: isDragging ? 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface))' : 'var(--theme-surface)',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mb-2" style={{ color: 'var(--theme-on-surface-variant)' }} />
                <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>拖拽或点击选择新照片</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="预览" className="w-full aspect-[4/3] object-cover rounded-xl" />
                  <button
                    onClick={() => { setUploadedFile(null); setPreviewUrl(null) }}
                    className="absolute top-2 right-2 p-2 rounded-full transition-all active:scale-90"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-on-primary)',
                    opacity: isUploading ? 0.5 : 1,
                  }}
                >
                  {isUploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> 上传中...</>
                  ) : (
                    <><Upload className="w-5 h-5" /> 更换照片</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 空状态 */
        <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-on-surface-variant)' }}>
          <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">选择或新建岩面</p>
          <p className="text-sm">选择岩面查看详情，或点击「新建岩面」创建</p>
        </div>
      )}
    </div>
  )

  // ============ 渲染 ============
  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ backgroundColor: 'var(--theme-surface)' }}>
      {/* Header */}
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
            <ImageIcon className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            <h1 className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>岩面管理</h1>
          </div>
          <div className="w-20 flex justify-end">
            {selectedCragId && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-xl transition-all duration-200 active:scale-95"
                style={{ color: 'var(--theme-primary)' }}
                title="刷新岩面列表"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
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

        {/* 移动端：列表/详情切换 */}
        <div className="lg:hidden">
          {!mobileShowDetail ? (
            leftPanel
          ) : (
            <div className="space-y-4 animate-fade-in-up">
              <button
                onClick={() => { setMobileShowDetail(false); setSelectedFace(null); setIsCreating(false) }}
                className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
                style={{ color: 'var(--theme-primary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">返回岩面列表</span>
              </button>
              {rightPanel}
            </div>
          )}
        </div>
      </div>

      {/* 覆盖确认对话框 */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <div className="max-w-sm w-full p-6 animate-scale-in" style={{ backgroundColor: 'var(--theme-surface)', borderRadius: 'var(--theme-radius-xl)', boxShadow: 'var(--theme-shadow-lg)' }}>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-warning) 15%, var(--theme-surface))' }}>
                <AlertCircle className="w-6 h-6" style={{ color: 'var(--theme-warning)' }} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--theme-on-surface)' }}>覆盖确认</h3>
                <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>该岩面已有照片，上传新照片将覆盖原有照片。确定要继续吗？</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{ backgroundColor: 'var(--theme-surface-variant)', color: 'var(--theme-on-surface)' }}
                onClick={() => setShowOverwriteConfirm(false)}
              >
                取消
              </button>
              <button
                className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{ backgroundColor: 'var(--theme-warning)', color: 'white' }}
                onClick={() => { setShowOverwriteConfirm(false); doUpload() }}
              >
                确认覆盖
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && selectedFace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <div className="max-w-sm w-full p-6 animate-scale-in" style={{ backgroundColor: 'var(--theme-surface)', borderRadius: 'var(--theme-radius-xl)', boxShadow: 'var(--theme-shadow-lg)' }}>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-error) 15%, var(--theme-surface))' }}>
                <Trash2 className="w-6 h-6" style={{ color: 'var(--theme-error)' }} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--theme-on-surface)' }}>删除岩面</h3>
                <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  确定要删除岩面「{selectedFace.faceId}」吗？
                  {selectedFace.routes.length > 0 && (
                    <span style={{ color: 'var(--theme-error)' }}>
                      {' '}该岩面关联了 {selectedFace.routes.length} 条线路，删除后这些线路的岩面关联将被清除。
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{ backgroundColor: 'var(--theme-surface-variant)', color: 'var(--theme-on-surface)' }}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                className="flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                style={{ backgroundColor: 'var(--theme-error)', color: 'white', opacity: isDeleting ? 0.7 : 1 }}
                onClick={handleDeleteFace}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 删除中...</>
                ) : (
                  '确认删除'
                )}
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
