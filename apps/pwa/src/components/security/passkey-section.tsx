'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Fingerprint, Trash2 } from 'lucide-react'

import { useToast } from '@/components/ui/toast'
import { usePasskeyManagement } from '@/hooks/use-passkey-management'
import { getPasskeyProvider } from '@/lib/passkey-providers'

export function PasskeySection() {
  const tAuth = useTranslations('Auth')
  const { showToast } = useToast()
  const { passkeys, isLoading: passkeysLoading, addPasskey, deletePasskey } = usePasskeyManagement()

  const handleAddPasskey = useCallback(async () => {
    try {
      const result = await addPasskey()
      if (result?.error) {
        showToast(tAuth('passkeyFailed'), 'error')
      } else {
        showToast(tAuth('passkeyAdded'), 'success')
      }
    } catch {
      showToast(tAuth('passkeyFailed'), 'error')
    }
  }, [addPasskey, showToast, tAuth])

  const handleDeletePasskey = useCallback(async (id: string) => {
    try {
      await deletePasskey(id)
      showToast(tAuth('passkeyDeleted'), 'success')
    } catch {
      showToast(tAuth('passkeyFailed'), 'error')
    }
  }, [deletePasskey, showToast, tAuth])

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Fingerprint className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
          {tAuth('registeredPasskeys')}
        </span>
      </div>
      {passkeysLoading ? (
        <div
          className="h-10 rounded-lg skeleton-shimmer"
          style={{ backgroundColor: 'var(--theme-surface-variant)' }}
        />
      ) : passkeys.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
          {tAuth('noPasskeys')}
        </p>
      ) : (
        <div className="space-y-2">
          {passkeys.map((pk) => {
            const provider = getPasskeyProvider(pk.aaguid)
            return (
              <div
                key={pk.id}
                className="glass-light flex items-center gap-2.5 p-2.5"
                style={{ borderRadius: 'var(--theme-radius-lg)' }}
              >
                <span className="text-lg leading-none" role="img" aria-label={provider.name}>
                  {provider.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-on-surface)' }}>
                    {pk.name || provider.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                    {new Date(pk.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeletePasskey(pk.id)}
                  className="p-1.5 rounded-full transition-all active:scale-90 shrink-0"
                  style={{ color: 'var(--theme-error)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
      <button
        onClick={handleAddPasskey}
        className="mt-2 text-sm font-medium"
        style={{ color: 'var(--theme-primary)' }}
      >
        + {tAuth('addDevice')}
      </button>
    </div>
  )
}
