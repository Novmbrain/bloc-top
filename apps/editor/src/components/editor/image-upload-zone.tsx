// apps/editor/src/components/editor/image-upload-zone.tsx
import { useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

interface ImageUploadZoneProps {
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
  uploadButtonText?: string
  emptyTitle?: string
  emptySubtitle?: string
  disabled?: boolean
}

export function ImageUploadZone({
  previewUrl,
  isDragging,
  isUploading,
  compressionProgress,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onClearFile,
  onUpload,
  uploadButtonText = '上传',
  emptyTitle = '上传照片',
  emptySubtitle = '拖拽或点击选择',
  disabled = false,
}: ImageUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {!previewUrl ? (
        <div
          className="relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center aspect-[4/3]"
          style={{
            borderColor: isDragging ? 'var(--theme-primary)' : 'var(--theme-outline)',
            backgroundColor: isDragging
              ? 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface))'
              : 'var(--theme-surface)',
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-10 h-10 mb-3" style={{ color: 'var(--theme-on-surface-variant)' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--theme-on-surface)' }}>{emptyTitle}</p>
          <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>{emptySubtitle}</p>
          {/* eslint-disable-next-line no-restricted-syntax -- type="file" is not a text input */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="预览" className="w-full aspect-[4/3] object-cover rounded-xl" />
            <button
              onClick={onClearFile}
              className="absolute top-2 right-2 p-2 rounded-full transition-all active:scale-90"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          {onUpload && (
            <button
              onClick={onUpload}
              disabled={isUploading || disabled}
              className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-on-primary)',
                opacity: isUploading || disabled ? 0.5 : 1,
              }}
            >
              {compressionProgress !== null ? (
                <div className="w-full px-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>压缩中...</span><span>{compressionProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-on-primary) 20%, transparent)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${compressionProgress}%`, backgroundColor: 'var(--theme-on-primary)' }} />
                  </div>
                </div>
              ) : isUploading ? (
                <><div className="w-5 h-5 animate-spin"><Loader2 className="w-full h-full" /></div> 上传中...</>
              ) : (
                <><Upload className="w-5 h-5" /> {uploadButtonText}</>
              )}
            </button>
          )}
        </div>
      )}
    </>
  )
}
