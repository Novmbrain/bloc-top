'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { KeyRound } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { authClient } from '@/lib/auth-client'

const MIN_PASSWORD_LENGTH = 4

interface PasswordSectionProps {
  isDrawerOpen: boolean
}

/**
 * Shared validation for password set/change flows.
 * Returns an error translation key or null if valid.
 */
function validatePasswords(newPassword: string, confirmPassword: string): string | null {
  if (newPassword.length < MIN_PASSWORD_LENGTH) return 'passwordTooShort'
  if (newPassword !== confirmPassword) return 'passwordMismatch'
  return null
}

export function PasswordSection({ isDrawerOpen }: PasswordSectionProps) {
  const tAuth = useTranslations('Auth')
  const tCommon = useTranslations('Common')
  const { showToast } = useToast()

  const [passwordExpanded, setPasswordExpanded] = useState(false)
  const [pwNewPassword, setPwNewPassword] = useState('')
  const [pwConfirmPassword, setPwConfirmPassword] = useState('')
  const [pwCurrentPassword, setPwCurrentPassword] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isDrawerOpen) return
    authClient.listAccounts().then((res) => {
      const accounts = res.data
      if (accounts) {
        setHasPassword(accounts.some((a: { providerId?: string; provider?: string }) =>
          a.providerId === 'credential' || a.provider === 'credential'
        ))
      }
    }).catch(() => {
      // Silently fail
    })
  }, [isDrawerOpen])

  const resetForm = useCallback(() => {
    setPasswordExpanded(false)
    setPwCurrentPassword('')
    setPwNewPassword('')
    setPwConfirmPassword('')
  }, [])

  const handleSetPassword = useCallback(async () => {
    if (!pwNewPassword || !pwConfirmPassword || isSettingPassword) return

    const validationError = validatePasswords(pwNewPassword, pwConfirmPassword)
    if (validationError) {
      showToast(tAuth(validationError), 'error')
      return
    }

    setIsSettingPassword(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwNewPassword }),
      })
      if (res.ok) {
        showToast(tAuth('passwordSetSuccess'), 'success')
        setHasPassword(true)
        resetForm()
      } else {
        showToast(tAuth('passwordSetFailed'), 'error')
      }
    } catch {
      showToast(tAuth('passwordSetFailed'), 'error')
    } finally {
      setIsSettingPassword(false)
    }
  }, [pwNewPassword, pwConfirmPassword, isSettingPassword, showToast, tAuth, resetForm])

  const handleChangePassword = useCallback(async () => {
    if (!pwCurrentPassword || !pwNewPassword || !pwConfirmPassword || isSettingPassword) return

    const validationError = validatePasswords(pwNewPassword, pwConfirmPassword)
    if (validationError) {
      showToast(tAuth(validationError), 'error')
      return
    }

    setIsSettingPassword(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword: pwCurrentPassword,
        newPassword: pwNewPassword,
      })
      if (error) {
        showToast(tAuth('passwordChangeFailed'), 'error')
      } else {
        showToast(tAuth('passwordChanged'), 'success')
        resetForm()
      }
    } catch {
      showToast(tAuth('passwordChangeFailed'), 'error')
    } finally {
      setIsSettingPassword(false)
    }
  }, [pwCurrentPassword, pwNewPassword, pwConfirmPassword, isSettingPassword, showToast, tAuth, resetForm])

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <KeyRound className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
          {hasPassword ? tAuth('hasPassword') : tAuth('noPassword')}
        </span>
      </div>

      {!passwordExpanded ? (
        <button
          onClick={() => setPasswordExpanded(true)}
          className="text-sm font-medium"
          style={{ color: 'var(--theme-primary)' }}
        >
          {hasPassword ? tAuth('changePassword') : tAuth('setPassword')}
        </button>
      ) : (
        <div className="space-y-2">
          {hasPassword && (
            <Input
              value={pwCurrentPassword}
              onChange={setPwCurrentPassword}
              placeholder={tAuth('currentPassword')}
              variant="form"
              type="password"
              autoComplete="current-password"
            />
          )}
          <Input
            value={pwNewPassword}
            onChange={setPwNewPassword}
            placeholder={tAuth('newPassword')}
            variant="form"
            type="password"
            autoComplete="new-password"
          />
          <Input
            value={pwConfirmPassword}
            onChange={setPwConfirmPassword}
            placeholder={tAuth('confirmPassword')}
            variant="form"
            type="password"
            autoComplete="new-password"
          />
          <div className="flex gap-2">
            <button
              onClick={resetForm}
              className="flex-1 p-2.5 text-sm font-medium transition-all active:scale-[0.98]"
              style={{
                color: 'var(--theme-on-surface-variant)',
                borderRadius: 'var(--theme-radius-lg)',
              }}
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={hasPassword ? handleChangePassword : handleSetPassword}
              disabled={isSettingPassword}
              className="flex-1 p-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-on-primary)',
                borderRadius: 'var(--theme-radius-lg)',
              }}
            >
              {hasPassword ? tAuth('changePassword') : tAuth('setPassword')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
