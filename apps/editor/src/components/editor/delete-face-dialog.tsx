// apps/editor/src/components/editor/delete-face-dialog.tsx
import { Trash2, Loader2 } from 'lucide-react'
import type { FaceGroup } from '@/hooks/use-face-data'

interface DeleteFaceDialogProps {
  selectedFace: FaceGroup
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteFaceDialog({ selectedFace, isDeleting, onCancel, onConfirm }: DeleteFaceDialogProps) {
  const affectedRoutes = selectedFace.routes.filter(r => r.topoLine && r.topoLine.length > 0)
  return (
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
                <span style={{ color: 'var(--theme-error)' }}> 该岩面关联了 {selectedFace.routes.length} 条线路，删除后这些线路的岩面关联将被清除。</span>
              )}
            </p>
          </div>
        </div>
        {affectedRoutes.length > 0 && (
          <div className="glass-light mb-5 p-3 space-y-1.5" style={{ borderRadius: 'var(--theme-radius-lg)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--theme-error)' }}>以下 {affectedRoutes.length} 条线路的 Topo 路线标注将被清除：</p>
            {affectedRoutes.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--theme-on-surface)' }}>{r.name}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>{r.grade}</span>
              </div>
            ))}
            <p className="text-xs mt-2" style={{ color: 'var(--theme-on-surface-variant)' }}>线路本身不会被删除，仅解除岩面关联并清除路线标注。</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isDeleting} className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] glass-light" style={{ color: 'var(--theme-on-surface)' }}>取消</button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]" style={{ backgroundColor: 'var(--theme-error)', color: 'white', opacity: isDeleting ? 0.7 : 1 }}>
            {isDeleting ? <><div className="w-4 h-4 animate-spin"><Loader2 className="w-full h-full" /></div> 删除中...</> : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  )
}
