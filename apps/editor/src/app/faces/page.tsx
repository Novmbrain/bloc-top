'use client'

import { useState, useMemo, useCallback } from 'react'
import { Image as ImageIcon, RefreshCw, Mountain } from 'lucide-react'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { useToast } from '@bloctop/ui/components/toast'
import { useFaceImageCache } from '@bloctop/ui/face-image/use-face-image'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import { useCragRoutes } from '@/hooks/use-crag-routes'
import { useFaceData, FACE_ID_PATTERN, type FaceGroup } from '@/hooks/use-face-data'
import { useFaceUpload } from '@/hooks/use-face-upload'
import { FaceListPanel } from '@/components/editor/face-list-panel'
import { FaceCreationPanel } from '@/components/editor/face-creation-panel'
import { FaceDetailPanel } from '@/components/editor/face-detail-panel'
import { OverwriteConfirmDialog } from '@/components/editor/overwrite-confirm-dialog'
import { DeleteFaceDialog } from '@/components/editor/delete-face-dialog'
import { deriveAreas, getPersistedAreas } from '@bloctop/shared/editor-areas'

export default function FaceManagementPage() {
  const {
    crags, routes, setRoutes, selectedCragId, setSelectedCragId,
    isLoadingCrags, isLoadingRoutes, stats, updateCragAreas,
  } = useCragRoutes({ editorMode: true })
  const faceImageCache = useFaceImageCache()
  const { showToast } = useToast()
  useBreakAppShellLimit()

  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedFace, setSelectedFace] = useState<FaceGroup | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const [newFaceId, setNewFaceId] = useState('')
  const [newArea, setNewArea] = useState('')
  const [faceFormErrors, setFaceFormErrors] = useState<Record<string, string>>({})
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [isSubmittingRename, setIsSubmittingRename] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isAddingArea, setIsAddingArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')

  const selectedCrag = useMemo(() => crags.find(c => c.id === selectedCragId), [crags, selectedCragId])
  const areas = useMemo(() => deriveAreas(routes, selectedCragId, selectedCrag), [routes, selectedCrag, selectedCragId])
  const persistedAreas = useMemo(() => getPersistedAreas(selectedCrag), [selectedCrag])

  const {
    isLoadingFaces, isRefreshing,
    faceGroups, handleRefresh, handleDeleteFace, handleRenameFace, handleUploadSuccess,
  } = useFaceData({ selectedCragId, routes, setRoutes, selectedArea, persistedAreas, updateCragAreas, faceImageCache })

  const upload = useFaceUpload()

  const handleSelectCrag = useCallback((id: string) => {
    setSelectedCragId(id)
    setSelectedFace(null)
    setIsCreating(false)
    setSelectedArea(null)
    setMobileShowDetail(false)
  }, [setSelectedCragId])

  const handleUpload = useCallback(async () => {
    if (isCreating) {
      const errors: Record<string, string> = {}
      if (!newFaceId.trim()) errors.faceId = '请输入岩面 ID'
      else if (!FACE_ID_PATTERN.test(newFaceId)) errors.faceId = '格式不正确'
      if (!newArea.trim()) errors.area = '请选择区域'
      if (Object.keys(errors).length > 0) { setFaceFormErrors(errors); return }
      setFaceFormErrors({})
    }
    if (!upload.uploadedFile || !selectedCragId) return
    const faceId = isCreating ? newFaceId : selectedFace?.faceId
    const area = isCreating ? newArea : selectedFace?.area
    if (!faceId || !area) return
    await upload.checkAndUpload({
      cragId: selectedCragId, faceId, area,
      onDirectUpload: () => upload.doUpload({
        cragId: selectedCragId, faceId, area,
        onSuccess: async (url) => {
          await handleUploadSuccess({ url, faceId, area, isCreating, newArea })
          if (isCreating) {
            setSelectedFace({ faceId, area, routes: [], imageUrl: url })
            setIsCreating(false); setNewFaceId(''); setNewArea('')
          }
        },
      }),
    })
  }, [isCreating, newFaceId, newArea, selectedFace, selectedCragId, upload, handleUploadSuccess,
      setSelectedFace, setIsCreating, setNewFaceId, setNewArea])

  const canCreate = isCreating && newFaceId.trim() && newArea.trim() && FACE_ID_PATTERN.test(newFaceId) && !!upload.uploadedFile

  const handleAddAreaKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newAreaName.trim() && selectedCragId) {
      const name = newAreaName.trim()
      try {
        await updateCragAreas(selectedCragId, [...new Set([...persistedAreas, name])].sort())
        showToast(`区域「${name}」已创建`, 'success', 3000)
      } catch {
        showToast('创建区域失败', 'error', 3000)
      }
      setNewAreaName(''); setIsAddingArea(false)
    } else if (e.key === 'Escape') {
      setNewAreaName(''); setIsAddingArea(false)
    }
  }, [newAreaName, selectedCragId, persistedAreas, updateCragAreas, showToast])

  const handleConfirmRename = useCallback(async () => {
    if (!selectedFace || !selectedCragId) return
    setIsSubmittingRename(true)
    try {
      const result = await handleRenameFace(selectedFace, renameValue)
      if (result) {
        setSelectedFace(prev => prev ? {
          ...prev,
          faceId: result,
          imageUrl: faceImageCache.getImageUrl({ cragId: selectedCragId, area: prev.area, faceId: result }),
        } : null)
        setIsRenaming(false)
      }
    } finally {
      setIsSubmittingRename(false)
    }
  }, [selectedFace, selectedCragId, renameValue, handleRenameFace, faceImageCache])

  const uploadProps = {
    previewUrl: upload.previewUrl, isDragging: upload.isDragging,
    isUploading: upload.isUploading, compressionProgress: upload.compressionProgress,
    onDragOver: upload.handleDragOver, onDragLeave: upload.handleDragLeave,
    onDrop: upload.handleDrop, onFileSelect: upload.handleFileSelect,
    onClearFile: upload.clearFile, onUpload: handleUpload,
  }

  const leftPanel = (
    <FaceListPanel
      crags={crags} selectedCragId={selectedCragId} isLoadingCrags={isLoadingCrags}
      stats={stats} onSelectCrag={handleSelectCrag}
      areas={areas} selectedArea={selectedArea} onSelectArea={setSelectedArea}
      isAddingArea={isAddingArea} newAreaName={newAreaName} setNewAreaName={setNewAreaName}
      onAddAreaKeyDown={handleAddAreaKeyDown} onStartAddArea={() => setIsAddingArea(true)}
      isCreating={isCreating}
      onStartCreate={() => { setIsCreating(true); setSelectedFace(null); setMobileShowDetail(true); setFaceFormErrors({}) }}
      isLoadingRoutes={isLoadingRoutes} isLoadingFaces={isLoadingFaces}
      faceGroups={faceGroups} selectedFace={selectedFace}
      onSelectFace={(face) => { setSelectedFace(face); setIsCreating(false); setIsRenaming(false); setMobileShowDetail(true) }}
    />
  )

  const rightPanel = !selectedCragId ? (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-on-surface-variant)' }}>
      <Mountain className="w-16 h-16 mb-4 opacity-30" />
      <p className="text-lg font-medium">选择岩场开始管理岩面</p>
    </div>
  ) : isCreating ? (
    <FaceCreationPanel
      areas={areas} existingFaceIds={faceGroups.map(f => f.faceId)}
      newFaceId={newFaceId} setNewFaceId={setNewFaceId}
      newArea={newArea} setNewArea={setNewArea}
      faceFormErrors={faceFormErrors} setFaceFormErrors={setFaceFormErrors}
      canCreate={!!canCreate} {...uploadProps}
    />
  ) : selectedFace ? (
    <FaceDetailPanel
      selectedFace={selectedFace}
      isRenaming={isRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
      isSubmittingRename={isSubmittingRename}
      onStartRename={() => { setIsRenaming(true); setRenameValue(selectedFace.faceId) }}
      onCancelRename={() => setIsRenaming(false)}
      onConfirmRename={handleConfirmRename}
      onDeleteClick={() => setShowDeleteConfirm(true)}
      {...uploadProps}
    />
  ) : (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-on-surface-variant)' }}>
      <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
      <p className="text-lg font-medium mb-1">选择或新建岩面</p>
      <p className="text-sm">选择岩面查看详情，或点击「新建岩面」创建</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ backgroundColor: 'var(--theme-surface)' }}>
      <EditorPageHeader title="岩面管理" icon={<ImageIcon className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />}
        isDetailMode={mobileShowDetail}
        onBackToList={() => { setMobileShowDetail(false); setSelectedFace(null); setIsCreating(false) }}
        listLabel="岩面列表"
        rightContent={selectedCragId ? (
          <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 rounded-xl transition-all duration-200 active:scale-95" style={{ color: 'var(--theme-primary)' }}>
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        ) : undefined}
      />
      <div className="max-w-4xl lg:max-w-none mx-auto px-4 lg:px-6 py-4">
        <div className="hidden lg:flex lg:gap-6 lg:h-[calc(100vh-73px)]">
          <div className="w-[380px] flex-shrink-0 flex flex-col overflow-hidden">{leftPanel}</div>
          <div className="flex-1 overflow-y-auto min-h-0">{rightPanel}</div>
        </div>
        <div className="lg:hidden">{!mobileShowDetail ? leftPanel : <div className="space-y-4 animate-fade-in-up">{rightPanel}</div>}</div>
      </div>

      {upload.showOverwriteConfirm && (() => {
        const faceId = isCreating ? newFaceId : selectedFace?.faceId
        const affectedRoutes = faceId ? routes.filter(r => r.faceId === faceId && r.topoLine && r.topoLine.length > 0) : []
        return (
          <OverwriteConfirmDialog affectedRoutes={affectedRoutes}
            clearTopoOnUpload={upload.clearTopoOnUpload} setClearTopoOnUpload={upload.setClearTopoOnUpload}
            onCancel={() => { upload.setShowOverwriteConfirm(false); upload.setClearTopoOnUpload(false) }}
            onConfirm={() => {
              upload.setShowOverwriteConfirm(false)
              const faceId2 = isCreating ? newFaceId : selectedFace?.faceId
              const area = isCreating ? newArea : selectedFace?.area
              if (faceId2 && area && selectedCragId) {
                upload.doUpload({ cragId: selectedCragId, faceId: faceId2, area,
                  onSuccess: async (url) => { await handleUploadSuccess({ url, faceId: faceId2, area, isCreating, newArea }) } })
              }
            }}
          />
        )
      })()}

      {showDeleteConfirm && selectedFace && (
        <DeleteFaceDialog selectedFace={selectedFace} isDeleting={isDeleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={async () => {
            setIsDeleting(true)
            const ok = await handleDeleteFace(selectedFace)
            setIsDeleting(false)
            if (ok) { setSelectedFace(null); setMobileShowDetail(false); setShowDeleteConfirm(false) }
          }}
        />
      )}
    </div>
  )
}
