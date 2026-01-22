'use client'

import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { WifiOff } from 'lucide-react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return !navigator.onLine
}

function getServerSnapshot() {
  return false
}

export default function OfflineIndicator() {
  const t = useTranslations('OfflineIndicator')
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (!isOffline) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 desktop-center-full z-50 px-4 py-2 flex items-center justify-center gap-2 animate-fade-in-up"
      style={{
        backgroundColor: 'var(--theme-warning)',
        color: 'white',
        transition: 'var(--theme-transition)',
      }}
    >
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">{t('message')}</span>
    </div>
  )
}
