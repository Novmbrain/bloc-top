import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Mountain, ChevronRight } from 'lucide-react'

/**
 * 首页引导入口卡片
 *
 * 始终显示，点击整卡跳转 /intro。
 */
export function WelcomeBanner() {
  const t = useTranslations('Intro')

  return (
    <Link
      href="/intro"
      aria-label={t('welcomeTitle')}
      className="block p-4 mb-4 transition-transform active:scale-[0.98]"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))',
        borderRadius: 'var(--theme-radius-xl)',
        transition: 'var(--theme-transition)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          <Mountain className="w-5 h-5" style={{ color: 'var(--theme-on-primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium" style={{ color: 'var(--theme-on-surface)' }}>
            {t('welcomeTitle')}
          </p>
          <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
            {t('welcomeDesc')}
          </p>
        </div>
        <ChevronRight
          className="w-5 h-5 flex-shrink-0"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        />
      </div>
    </Link>
  )
}
