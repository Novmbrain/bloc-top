'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { KeyRound, Fingerprint, Edit3, LogOut, Trash2, ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { signOut, authClient } from '@/lib/auth-client'
import { usePasskeyManagement } from '@/hooks/use-passkey-management'
import { getPasskeyProvider } from '@/lib/passkey-providers'

interface SecurityDrawerProps {
  isOpen: boolean
  onClose: () => void
  session: { user: { email: string; role?: string } }
  isAdmin: boolean
}

export function SecurityDrawer({ isOpen, onClose, session, isAdmin }: SecurityDrawerProps) {
  const tAuth = useTranslations('Auth')
  const tCommon = useTranslations('Common')
  const t = useTranslations('Profile')
  const { showToast } = useToast()

  // Passkey management
  const { passkeys, isLoading: passkeysLoading, addPasskey, deletePasskey } = usePasskeyManagement()

  // Password management state
  const [passwordExpanded, setPasswordExpanded] = useState(false)
  const [pwNewPassword, setPwNewPassword] = useState('')
  const [pwConfirmPassword, setPwConfirmPassword] = useState('')
  const [pwCurrentPassword, setPwCurrentPassword] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isOpen) return
    authClient.listAccounts().then((res) => {
      const accounts = res.data
      if (accounts) {
        setHasPassword(accounts.some((a: { providerId?: string; provider?: string }) => a.providerId === 'credential' || a.provider === 'credential'))
      }
    }).catch(() => {
      // Silently fail
    })
  }, [isOpen])

  const handleSetPassword = useCallback(async () => {
    if (!pwNewPassword || !pwConfirmPassword || isSettingPassword) return
    if (pwNewPassword.length < 8) {
      showToast(tAuth('passwordTooShort'), 'error')
      return
    }
    if (pwNewPassword !== pwConfirmPassword) {
      showToast(tAuth('passwordMismatch'), 'error')
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
        setPasswordExpanded(false)
        setPwNewPassword('')
        setPwConfirmPassword('')
      } else {
        showToast(tAuth('passwordSetFailed'), 'error')
      }
    } catch {
      showToast(tAuth('passwordSetFailed'), 'error')
    } finally {
      setIsSettingPassword(false)
    }
  }, [pwNewPassword, pwConfirmPassword, isSettingPassword, showToast, tAuth])

  const handleChangePassword = useCallback(async () => {
    if (!pwCurrentPassword || !pwNewPassword || !pwConfirmPassword || isSettingPassword) return
    if (pwNewPassword.length < 8) {
      showToast(tAuth('passwordTooShort'), 'error')
      return
    }
    if (pwNewPassword !== pwConfirmPassword) {
      showToast(tAuth('passwordMismatch'), 'error')
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
        setPasswordExpanded(false)
        setPwCurrentPassword('')
        setPwNewPassword('')
        setPwConfirmPassword('')
      }
    } catch {
      showToast(tAuth('passwordChangeFailed'), 'error')
    } finally {
      setIsSettingPassword(false)
    }
  }, [pwCurrentPassword, pwNewPassword, pwConfirmPassword, isSettingPassword, showToast, tAuth])

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

  const handleLogout = useCallback(async () => {
    await signOut()
    showToast(tAuth('logout'), 'success')
    onClose()
  }, [showToast, tAuth, onClose])

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      height="three-quarter"
      showHandle
      title={t('accountSecurity')}
    >
      <div className="px-4 pb-6 space-y-5">
        {/* Email header */}
        <div
          className="glass-light flex items-center gap-3 p-3"
          style={{ borderRadius: 'var(--theme-radius-lg)' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))' }}
          >
            ✉️
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>
            {session.user.email}
          </p>
        </div>

        {/* Password section */}
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
                  onClick={() => {
                    setPasswordExpanded(false)
                    setPwCurrentPassword('')
                    setPwNewPassword('')
                    setPwConfirmPassword('')
                  }}
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

        {/* Passkey section */}
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

        {/* Editor entry (admin only) */}
        {isAdmin && (
          <Link
            href="/editor"
            className="glass-light w-full flex items-center gap-3 p-3 transition-all active:scale-[0.98]"
            style={{ borderRadius: 'var(--theme-radius-lg)' }}
          >
            <Edit3 className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>
              {t('editorEntry')}
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-on-surface-variant)' }} />
          </Link>
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
      </div>
    </Drawer>
  )
}
