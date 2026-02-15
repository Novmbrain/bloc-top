'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, X } from 'lucide-react'

const DISMISS_KEY = 'maintenance-banner-dismissed'

export function MaintenanceBanner() {
  const t = useTranslations('MaintenanceBanner')
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(DISMISS_KEY) === 'true'
  })

  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== 'true' || dismissed) {
    return null
  }

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 desktop-center-full z-50 animate-fade-in-up"
      style={{
        background: 'color-mix(in srgb, var(--theme-error) 90%, transparent)',
        WebkitBackdropFilter: 'blur(var(--glass-blur-sm))',
        backdropFilter: 'blur(var(--glass-blur-sm))',
        color: 'white',
      }}
    >
      <div className="w-full px-4 py-2 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">{t('message')}</span>
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-2 p-0.5 rounded-full transition-colors hover:bg-white/20"
          aria-label={t('dismiss')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
