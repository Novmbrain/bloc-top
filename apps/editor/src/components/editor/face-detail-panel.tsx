// apps/editor/src/components/editor/face-detail-panel.tsx
import { Pencil, Check, X, Loader2, Trash2 } from 'lucide-react'
import { Input } from '@bloctop/ui/components/input'
import { ImageUploadZone } from '@/components/editor/image-upload-zone'
import { FACE_ID_CLEANUP } from '@/hooks/use-face-data'
import type { FaceGroup } from '@/hooks/use-face-data'

interface FaceDetailPanelProps {
  selectedFace: FaceGroup
  isRenaming: boolean
  renameValue: string
  setRenameValue: (v: string) => void
  isSubmittingRename: boolean
  onStartRename: () => void
  onCancelRename: () => void
  onConfirmRename: () => void
  onDeleteClick: () => void
  // upload zone props
  previewUrl: string | null
  isDragging: boolean
  isUploading: boolean
  compressionProgress: number | null
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  onUpload: () => void
}

export function FaceDetailPanel({
  selectedFace, isRenaming, renameValue, setRenameValue,
  isSubmittingRename, onStartRename, onCancelRename, onConfirmRename, onDeleteClick,
  previewUrl, isDragging, isUploading, compressionProgress,
  onDragOver, onDragLeave, onDrop, onFileSelect, onClearFile, onUpload,
}: FaceDetailPanelProps) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* 大图预览 */}
      <div className="aspect-[4/3]" style={{ borderRadius: 'var(--theme-radius-xl)', overflow: 'hidden', backgroundColor: 'var(--theme-surface-variant)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedFace.imageUrl} alt={selectedFace.faceId} className="w-full h-full object-cover" />
      </div>

      {/* 岩面信息 */}
      <div className="glass-light p-4" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
        <div className="flex items-center justify-between mb-3 gap-2">
          {isRenaming ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input
                value={renameValue}
                onChange={setRenameValue}
                onBlur={(e) => { setRenameValue(e.target.value.toLowerCase().replace(FACE_ID_CLEANUP, '')) }}
                onKeyDown={(e) => { if (e.key === 'Enter') onConfirmRename(); if (e.key === 'Escape') onCancelRename() }}
                autoFocus
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg font-semibold"
                disabled={isSubmittingRename}
              />
              <button onClick={onConfirmRename} disabled={isSubmittingRename || !renameValue.trim()} className="p-1.5 rounded-lg transition-all active:scale-90" style={{ color: 'var(--theme-primary)' }}>
                {isSubmittingRename ? <div className="w-4 h-4 animate-spin"><Loader2 className="w-full h-full" /></div> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={onCancelRename} disabled={isSubmittingRename} className="p-1.5 rounded-lg transition-all active:scale-90" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-semibold truncate" style={{ color: 'var(--theme-on-surface)' }}>{selectedFace.faceId}</h3>
              <button onClick={onStartRename} className="p-1.5 rounded-lg transition-all active:scale-90 flex-shrink-0" style={{ color: 'var(--theme-on-surface-variant)' }} title="重命名">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <span className="text-sm px-3 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface-variant)' }}>
            {selectedFace.area}
          </span>
        </div>

        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--theme-on-surface-variant)' }}>关联线路 ({selectedFace.routes.length})</h4>
        <div className="space-y-1.5">
          {selectedFace.routes.map(r => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--theme-surface)' }}>
              <span className="flex-1 text-sm truncate" style={{ color: 'var(--theme-on-surface)' }}>{r.name}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>{r.grade}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 删除按钮 */}
      <button
        onClick={onDeleteClick}
        className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
        style={{ backgroundColor: 'color-mix(in srgb, var(--theme-error) 12%, var(--theme-surface))', color: 'var(--theme-error)' }}
      >
        <Trash2 className="w-4 h-4" /> 删除岩面
      </button>

      {/* 更换照片 */}
      <div className="glass-light p-4" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--theme-on-surface)' }}>更换照片</h3>
        <ImageUploadZone
          previewUrl={previewUrl}
          isDragging={isDragging}
          isUploading={isUploading}
          compressionProgress={compressionProgress}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onFileSelect={onFileSelect}
          onClearFile={onClearFile}
          onUpload={onUpload}
          uploadButtonText="更换照片"
          emptyTitle="拖拽或点击选择新照片"
          emptySubtitle=""
        />
      </div>
    </div>
  )
}
