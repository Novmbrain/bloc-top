// apps/editor/src/components/editor/overwrite-confirm-dialog.tsx
import { AlertCircle } from 'lucide-react'
import type { Route } from '@bloctop/shared/types'

interface OverwriteConfirmDialogProps {
  affectedRoutes: Route[]
  clearTopoOnUpload: boolean
  setClearTopoOnUpload: (v: boolean) => void
  onCancel: () => void
  onConfirm: () => void
}

export function OverwriteConfirmDialog({
  affectedRoutes, clearTopoOnUpload, setClearTopoOnUpload, onCancel, onConfirm,
}: OverwriteConfirmDialogProps) {
  return (
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

        {affectedRoutes.length > 0 && (
          <div className="glass-light mb-5 p-3 space-y-2" style={{ borderRadius: 'var(--theme-radius-lg)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--theme-warning)' }}>以下 {affectedRoutes.length} 条线路有 Topo 路线标注：</p>
            {affectedRoutes.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--theme-on-surface)' }}>{r.name}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>{r.grade}</span>
              </div>
            ))}
            <div className="space-y-2 mt-3">
              {[
                { value: false, label: '保留现有标注', hint: '新照片角度与原图相同时选择' },
                { value: true, label: '清除标注，稍后重新标注', hint: '新照片角度不同时选择', danger: true },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setClearTopoOnUpload(opt.value)}
                  className="w-full text-left p-3 rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: clearTopoOnUpload === opt.value
                      ? `color-mix(in srgb, var(${opt.danger ? '--theme-error' : '--theme-primary'}) 12%, var(--theme-surface))`
                      : 'var(--theme-surface)',
                    border: clearTopoOnUpload === opt.value
                      ? `2px solid var(${opt.danger ? '--theme-error' : '--theme-primary'})`
                      : '2px solid transparent',
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>{opt.label}</span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--theme-on-surface-variant)' }}>{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] glass-light" style={{ color: 'var(--theme-on-surface)' }}>取消</button>
          <button onClick={onConfirm} className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]" style={{ backgroundColor: 'var(--theme-warning)', color: 'white' }}>确认覆盖</button>
        </div>
      </div>
    </div>
  )
}
