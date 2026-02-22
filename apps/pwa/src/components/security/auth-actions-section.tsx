'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Edit3, ExternalLink, LogOut } from 'lucide-react'

import { useToast } from '@/components/ui/toast'
import { signOut } from '@/lib/auth-client'

interface AuthActionsSectionProps {
  hasEditorAccess: boolean
  onClose: () => void
}

export function AuthActionsSection({ hasEditorAccess, onClose }: AuthActionsSectionProps) {
  const tAuth = useTranslations('Auth')
  const t = useTranslations('Profile')
  const { showToast } = useToast()

  const handleLogout = useCallback(async () => {
    await signOut()
    showToast(tAuth('logout'), 'success')
    onClose()
  }, [showToast, tAuth, onClose])

  return (
    <>
      {/* Editor entry (admin or manager with crag permissions) */}
      {hasEditorAccess && (
        <a
          href={process.env.NEXT_PUBLIC_EDITOR_URL || 'https://editor.bouldering.top'}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-light w-full flex items-center gap-3 p-3 transition-all active:scale-[0.98]"
          style={{ borderRadius: 'var(--theme-radius-lg)' }}
        >
          <Edit3 className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>
            {t('editorEntry')}
          </span>
          <ExternalLink className="w-4 h-4" style={{ color: 'var(--theme-on-surface-variant)' }} />
        </a>
      )}

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium transition-all active:scale-[0.98]"
        style={{
          color: 'var(--theme-error)',
          borderRadius: 'var(--theme-radius-lg)',
          backgroundColor: 'color-mix(in srgb, var(--theme-error) 8%, transparent)',
        }}
      >
        <LogOut className="w-4 h-4" />
        {tAuth('logout')}
      </button>
    </>
  )
}
