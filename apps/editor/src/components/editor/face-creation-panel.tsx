// apps/editor/src/components/editor/face-creation-panel.tsx
import { Input } from '@bloctop/ui/components/input'
import { AreaSelect } from '@/components/editor/area-select'
import { ImageUploadZone } from '@/components/editor/image-upload-zone'

const FACE_ID_CLEANUP = /[^\u4e00-\u9fffa-z0-9-]/g

interface FaceCreationPanelProps {
  areas: string[]
  existingFaceIds: string[]
  newFaceId: string
  setNewFaceId: (v: string) => void
  newArea: string
  setNewArea: (v: string) => void
  faceFormErrors: Record<string, string>
  setFaceFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  // upload zone props
  previewUrl: string | null
  isDragging: boolean
  isUploading: boolean
  compressionProgress: number | null
  canCreate: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  onUpload: () => void
}

export function FaceCreationPanel({
  areas, existingFaceIds,
  newFaceId, setNewFaceId, newArea, setNewArea,
  faceFormErrors, setFaceFormErrors,
  previewUrl, isDragging, isUploading, compressionProgress, canCreate,
  onDragOver, onDragLeave, onDrop, onFileSelect, onClearFile, onUpload,
}: FaceCreationPanelProps) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="glass-light p-4" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--theme-on-surface)' }}>新建岩面</h3>
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
            区域 (Area)
          </label>
          <AreaSelect
            areas={areas}
            value={newArea}
            onChange={(area) => { setNewArea(area); setFaceFormErrors(prev => { const next = {...prev}; delete next.area; return next }) }}
            placeholder="选择区域..."
            required
            error={faceFormErrors.area}
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
            岩面 ID (faceId)
          </label>
          <Input
            placeholder="如 主墙-1 或 main-wall-1"
            value={newFaceId}
            onChange={(v) => { setNewFaceId(v); setFaceFormErrors(prev => { const next = {...prev}; delete next.faceId; return next }) }}
            onBlur={(e) => { setNewFaceId(e.target.value.toLowerCase().replace(FACE_ID_CLEANUP, '')) }}
            style={faceFormErrors.faceId ? { borderColor: 'var(--theme-error)' } : undefined}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>只允许中文、小写字母、数字和连字符</p>
          {faceFormErrors.faceId && (
            <p className="text-xs mt-1" style={{ color: 'var(--theme-error)' }} role="alert">{faceFormErrors.faceId}</p>
          )}
          {newFaceId && existingFaceIds.includes(newFaceId) && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--theme-warning)' }}>该 ID 已存在，上传将覆盖现有照片</p>
          )}
        </div>
      </div>
      <div className="glass-light p-4" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--theme-on-surface)' }}>岩面照片</h3>
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
          uploadButtonText="创建岩面"
          emptyTitle="上传岩面照片"
          emptySubtitle="拖拽或点击选择"
          disabled={!canCreate}
        />
      </div>
    </div>
  )
}
