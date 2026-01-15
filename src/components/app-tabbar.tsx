'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Mountain, User } from 'lucide-react'
import { colors } from '@/lib/tokens'

const TAB_ITEMS = [
  { name: 'home', path: '/', icon: Home, label: '首页' },
  { name: 'routes', path: '/route', icon: Mountain, label: '线路' },
  { name: 'profile', path: '/profile', icon: User, label: '我的' },
]

export function AppTabbar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--m3-outline-variant)]/50 safe-area-bottom z-50">
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
              {/* 选中状态背景指示器 */}
              <div
                className={`absolute top-2 w-14 h-8 rounded-full transition-all duration-300 ease-out ${active
                    ? 'bg-[var(--m3-primary-container)] scale-100 opacity-100'
                    : 'bg-transparent scale-75 opacity-0 group-hover:bg-[var(--m3-surface-variant)]/50 group-hover:scale-100 group-hover:opacity-100'
                  }`}
              />

              {/* 图标 */}
              <Icon
                className={`relative z-10 w-5 h-5 mb-1 transition-all duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                style={{
                  color: active ? colors.primary : colors.outline,
                  strokeWidth: active ? 2.5 : 2
                }}
              />

              {/* 标签 */}
              <span
                className={`relative z-10 text-[11px] font-medium transition-all duration-200 ${active ? 'font-semibold' : ''
                  }`}
                style={{ color: active ? colors.primary : colors.outline }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
