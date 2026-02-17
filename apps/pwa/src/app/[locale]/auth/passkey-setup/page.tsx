'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Fingerprint, Check, ArrowRight } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { useToast } from '@/components/ui/toast'
import { authClient, useSession } from '@/lib/auth-client'

export default function PasskeySetupPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const { showToast } = useToast()
  const { data: session, isPending } = useSession()

  // Redirect to login if no session
  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login')
    }
  }, [session, isPending, router])

  const handleSetupPasskey = async () => {
    try {
      const result = await authClient.passkey.addPasskey()
      if (result?.error) {
        showToast(t('passkeyFailed'), 'error')
      } else {
        showToast(t('passkeyAdded'), 'success')
        router.push('/')
      }
    } catch {
      showToast(t('passkeyFailed'), 'error')
    }
  }

  if (isPending) return null

  return (
    <div
      className="flex flex-col h-dvh overflow-hidden"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      <main className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-4">
        <div className="max-w-sm w-full text-center">
          {/* Success icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-success) 15%, var(--theme-surface))' }}
          >
            <Check className="w-10 h-10" style={{ color: 'var(--theme-success)' }} />
          </div>

          <h1
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {t('passkeySetupTitle')}
          </h1>
          <p
            className="text-sm mb-8"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {t('passkeySetupDesc')}
          </p>

          {/* Setup Passkey button */}
          <button
            onClick={handleSetupPasskey}
            className="w-full flex items-center justify-center gap-2 p-3.5 font-medium transition-all active:scale-[0.98] mb-4"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          >
            <Fingerprint className="w-5 h-5" />
            {t('setupPasskey')}
          </button>

          {/* Skip button */}
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {t('skipForNow')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  )
}
