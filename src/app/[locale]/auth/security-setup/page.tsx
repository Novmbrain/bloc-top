'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Check, KeyRound, Fingerprint, ArrowRight } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { useToast } from '@/components/ui/toast'
import { Input } from '@/components/ui/input'
import { authClient, useSession } from '@/lib/auth-client'

export default function SecuritySetupPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const { showToast } = useToast()
  const { data: session, isPending } = useSession()

  // Password form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [passwordSet, setPasswordSet] = useState(false)

  // Passkey state
  const [passkeyAdded, setPasskeyAdded] = useState(false)

  // Redirect to login if no session
  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login')
    }
  }, [session, isPending, router])

  const handleSetPassword = useCallback(async () => {
    if (!newPassword || !confirmPassword || isSettingPassword) return

    if (newPassword.length < 8) {
      showToast(t('passwordTooShort'), 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast(t('passwordMismatch'), 'error')
      return
    }

    setIsSettingPassword(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      if (res.ok) {
        setPasswordSet(true)
        showToast(t('passwordSetSuccess'), 'success')
      } else {
        const data = await res.json()
        console.error('[SecuritySetup] setPassword failed:', data.error)
        showToast(t('passwordSetFailed'), 'error')
      }
    } catch (err) {
      console.error('[SecuritySetup] setPassword exception:', err)
      showToast(t('passwordSetFailed'), 'error')
    } finally {
      setIsSettingPassword(false)
    }
  }, [newPassword, confirmPassword, isSettingPassword, showToast, t])

  const handleSetupPasskey = useCallback(async () => {
    try {
      const result = await authClient.passkey.addPasskey()
      if (result?.error) {
        showToast(t('passkeyFailed'), 'error')
      } else {
        setPasskeyAdded(true)
        showToast(t('passkeyAdded'), 'success')
      }
    } catch {
      showToast(t('passkeyFailed'), 'error')
    }
  }, [showToast, t])

  if (isPending) return null

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      <main className="flex-1 px-4 pt-16 pb-8">
        <div className="max-w-sm mx-auto">
          {/* Success icon */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'color-mix(in srgb, var(--theme-success) 15%, var(--theme-surface))' }}
            >
              <Check className="w-8 h-8" style={{ color: 'var(--theme-success)' }} />
            </div>
            <h1
              className="text-xl font-bold mb-2"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              {t('securitySetupTitle')}
            </h1>
            <p
              className="text-sm"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {t('securitySetupDesc')}
            </p>
          </div>

          {/* Password Setup Card */}
          <div
            className="glass p-4 mb-4"
            style={{
              borderRadius: 'var(--theme-radius-xl)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
                {t('setPassword')}
              </span>
              {passwordSet && (
                <Check className="w-4 h-4 ml-auto" style={{ color: 'var(--theme-success)' }} />
              )}
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('setPasswordHint')}
            </p>

            {!passwordSet ? (
              <div>
                <div className="mb-3">
                  <Input
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder={t('newPassword')}
                    variant="form"
                    type="password"
                    autoComplete="new-password"
                  />
                </div>
                <div className="mb-3">
                  <Input
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder={t('confirmPassword')}
                    variant="form"
                    type="password"
                    autoComplete="new-password"
                  />
                </div>
                <button
                  onClick={handleSetPassword}
                  disabled={!newPassword || !confirmPassword || isSettingPassword}
                  className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-on-primary)',
                    borderRadius: 'var(--theme-radius-lg)',
                  }}
                >
                  {isSettingPassword ? t('sending') : t('setPassword')}
                </button>
              </div>
            ) : (
              <p className="text-xs font-medium" style={{ color: 'var(--theme-success)' }}>
                {t('passwordSetSuccess')}
              </p>
            )}
          </div>

          {/* Passkey Setup Card */}
          <div
            className="glass p-4 mb-8"
            style={{
              borderRadius: 'var(--theme-radius-xl)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Fingerprint className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
                {t('setupPasskey')}
              </span>
              {passkeyAdded && (
                <Check className="w-4 h-4 ml-auto" style={{ color: 'var(--theme-success)' }} />
              )}
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('passkeySetupDesc')}
            </p>

            {!passkeyAdded ? (
              <button
                onClick={handleSetupPasskey}
                className="glass-light w-full flex items-center justify-center gap-2 p-3 text-sm font-medium transition-all active:scale-[0.98]"
                style={{
                  color: 'var(--theme-on-surface)',
                  borderRadius: 'var(--theme-radius-lg)',
                }}
              >
                <Fingerprint className="w-4 h-4" />
                {t('setupPasskey')}
              </button>
            ) : (
              <p className="text-xs font-medium" style={{ color: 'var(--theme-success)' }}>
                {t('passkeyAdded')}
              </p>
            )}
          </div>

          {/* Skip button */}
          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1 text-sm font-medium"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {t('skipForNow')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
