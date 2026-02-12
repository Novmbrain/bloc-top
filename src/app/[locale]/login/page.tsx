'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Mail, ArrowLeft, Fingerprint } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useToast } from '@/components/ui/toast'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

const RESEND_COOLDOWN = 60 // seconds

export default function LoginPage() {
  const t = useTranslations('Auth')
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendMagicLink = useCallback(async () => {
    if (!email.trim() || isSending || countdown > 0) return

    setIsSending(true)
    try {
      const { error } = await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: '/',
      })
      if (error) {
        console.error('[Login] Magic Link error:', error)
        showToast(t('sendFailed'), 'error')
      } else {
        setIsSent(true)
        setCountdown(RESEND_COOLDOWN)
      }
    } catch (err) {
      console.error('[Login] Magic Link exception:', err)
      showToast(t('sendFailed'), 'error')
    } finally {
      setIsSending(false)
    }
  }, [email, isSending, countdown, showToast, t])

  const handleResend = useCallback(() => {
    setIsSent(false)
    handleSendMagicLink()
  }, [handleSendMagicLink])

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      {/* Header */}
      <header className="pt-12 px-4 pb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToHome')}
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pt-8">
        <div className="max-w-sm mx-auto">
          {/* Title */}
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {t('loginTitle')}
          </h1>
          <p
            className="text-sm mb-8"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {t('firstTimeHint')}
          </p>

          {!isSent ? (
            /* Email input + send button */
            <div>
              <div className="mb-4">
                <Input
                  value={email}
                  onChange={setEmail}
                  placeholder={t('emailPlaceholder')}
                  variant="form"
                  autoComplete="email webauthn"
                  inputMode="email"
                  autoFocus
                />
              </div>

              <button
                onClick={handleSendMagicLink}
                disabled={!email.trim() || isSending}
                className="w-full flex items-center justify-center gap-2 p-3.5 font-medium transition-all active:scale-[0.98] disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                  borderRadius: 'var(--theme-radius-lg)',
                }}
              >
                <Mail className="w-5 h-5" />
                {isSending ? t('sending') : t('sendMagicLink')}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-outline-variant)' }} />
                <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {t('or')}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-outline-variant)' }} />
              </div>

              {/* Passkey button (Phase 2 — currently hidden if no Passkey support) */}
              <button
                onClick={async () => {
                  try {
                    // Phase 2: will call signIn.passkey()
                    showToast(t('passkeyNotSetup'), 'info')
                  } catch {
                    showToast(t('passkeyFailed'), 'error')
                  }
                }}
                className="w-full flex items-center justify-center gap-2 p-3.5 font-medium transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  color: 'var(--theme-on-surface)',
                  borderRadius: 'var(--theme-radius-lg)',
                }}
              >
                <Fingerprint className="w-5 h-5" />
                {t('passkeyLogin')}
              </button>
            </div>
          ) : (
            /* Sent state */
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'color-mix(in srgb, var(--theme-success) 15%, var(--theme-surface))' }}
              >
                <Mail className="w-8 h-8" style={{ color: 'var(--theme-success)' }} />
              </div>
              <h2
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                {t('magicLinkSent', { email })}
              </h2>
              <p
                className="text-sm mb-6"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                {t('magicLinkSentHint')}
              </p>

              {countdown > 0 ? (
                <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {t('resendIn', { seconds: countdown })}
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-sm font-medium"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  {t('resend')}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
