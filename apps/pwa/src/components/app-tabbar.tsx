'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { Home, Mountain, Settings } from 'lucide-react'

// 导航项配置 - label 使用翻译键
const TAB_ITEMS = [
  { name: 'home', path: '/', icon: Home, labelKey: 'home' },
  { name: 'routes', path: '/route', icon: Mountain, labelKey: 'routes' },
  { name: 'settings', path: '/profile', icon: Settings, labelKey: 'settings' },
] as const

export function AppTabbar() {
  const t = useTranslations('Navigation')
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 desktop-center-full glass-heavy safe-area-bottom z-50"
      style={{
        borderTop: 'var(--glass-border)',
        transition: 'var(--theme-transition)',
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.path)

          return (
            <Link
              key={tab.name}
              href={tab.path}
              className="relative flex flex-col items-center justify-center flex-1 h-full group active:scale-95 transition-transform"
            >
              {/* 图标容器 + 选中状态背景指示器 */}
              <div className="relative flex items-center justify-center w-16 h-8 mb-1">
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-300 ease-out ${active
                      ? 'scale-100 opacity-100'
                      : 'bg-transparent scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100'
                    }`}
                  style={{
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                      : undefined,
                  }}
                />
                <Icon
                  className={`relative z-10 w-5 h-5 transition-all duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'
                    }`}
                  style={{
                    color: active ? 'var(--theme-primary)' : 'var(--theme-on-surface-variant)',
                    strokeWidth: active ? 2.5 : 2
                  }}
                />
              </div>

              {/* 标签 */}
              <span
                className={`relative z-10 text-[11px] font-medium transition-all duration-200 ${active ? 'font-semibold' : ''
                  }`}
                style={{ color: active ? 'var(--theme-primary)' : 'var(--theme-on-surface-variant)' }}
              >
                {t(tab.labelKey)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
