'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, AlertCircle } from 'lucide-react'
import { Link } from '@/i18n/navigation'

/**
 * Magic Link 验证中间页
 *
 * 当 better-auth 的 Magic Link callback 需要自定义 UI 时使用。
 * 默认情况下 better-auth 会自动处理 token 验证并重定向到 callbackURL，
 * 此页面作为验证失败时的 fallback。
 */
export default function VerifyPage() {
  const t = useTranslations('Auth')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // If the page is still showing after 5 seconds, verification likely failed
    const timer = setTimeout(() => setFailed(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="flex flex-col min-h-screen items-center justify-center"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      <div className="text-center px-4">
        {!failed ? (
          <>
            <Loader2
              className="w-10 h-10 animate-spin mx-auto mb-4"
              style={{ color: 'var(--theme-primary)' }}
            />
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('verifying')}
            </p>
          </>
        ) : (
          <>
            <AlertCircle
              className="w-10 h-10 mx-auto mb-4"
              style={{ color: 'var(--theme-error)' }}
            />
            <p
              className="text-sm font-medium mb-4"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              {t('verifyFailed')}
            </p>
            <Link
              href="/login"
              className="text-sm font-medium"
              style={{ color: 'var(--theme-primary)' }}
            >
              {t('verifyRetry')}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
