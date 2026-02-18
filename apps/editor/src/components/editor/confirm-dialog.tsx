import { Loader2 } from 'lucide-react'
import type React from 'react'

export interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string | React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  isLoading?: boolean
  icon?: React.ReactNode
  children?: React.ReactNode
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel,
  cancelLabel = '取消',
  variant = 'warning',
  isLoading = false,
  icon,
  children,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const confirmBg = variant === 'danger' ? 'var(--theme-error)' : 'var(--theme-primary)'
  const confirmColor = variant === 'danger' ? 'white' : 'var(--theme-on-primary)'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onCancel}
      data-testid="confirm-dialog-backdrop"
    >
      <div
        className="max-w-sm w-full p-6 animate-scale-in"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderRadius: 'var(--theme-radius-xl)',
          boxShadow: 'var(--theme-shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {icon && (
          <div className="flex items-start gap-4 mb-5">
            {icon}
            <div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--theme-on-surface)' }}>
                {title}
              </h3>
              {typeof description === 'string' ? (
                <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {description}
                </p>
              ) : description}
            </div>
          </div>
        )}

        {!icon && (
          <>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-on-surface)' }}>
              {title}
            </h3>
            {typeof description === 'string' ? (
              <p className="text-sm mb-6" style={{ color: 'var(--theme-on-surface-variant)' }}>
                {description}
              </p>
            ) : <div className="mb-6">{description}</div>}
          </>
        )}

        {children}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] glass-light"
            style={{
              color: 'var(--theme-on-surface)',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: confirmBg,
              color: confirmColor,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {confirmLabel}</>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
