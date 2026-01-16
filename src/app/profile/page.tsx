'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, User, Info, LogIn, Palette } from 'lucide-react'
import { AppTabbar } from '@/components/app-tabbar'
import { ThemeSwitcher } from '@/components/theme-switcher'

export default function ProfilePage() {
  const router = useRouter()

  const menuItems = [
    { icon: LogIn, label: '登录 / 注册', description: '登录后可发表评论' },
    { icon: Info, label: '关于', description: '关于罗源野抱 TOPO' },
  ]

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{
        backgroundColor: 'var(--theme-surface)',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 头部 */}
      <header className="pt-12 px-4 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--theme-on-surface)' }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-on-surface)' }}>
            我的
          </h1>
        </div>

        {/* 用户信息卡片 */}
        <div
          className="p-4"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderRadius: 'var(--theme-radius-xl)',
            boxShadow: 'var(--theme-shadow-sm)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            >
              <User className="w-8 h-8" style={{ color: 'var(--theme-on-surface-variant)' }} />
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
                未登录
              </p>
              <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
                点击登录以解锁更多功能
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <main className="flex-1 px-4 pb-20">
        {/* 外观设置区块 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
              外观设置
            </span>
          </div>
          <ThemeSwitcher />
        </div>

        {/* 菜单列表 */}
        <div className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                className="w-full flex items-center gap-4 p-4 transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderRadius: 'var(--theme-radius-xl)',
                  boxShadow: 'var(--theme-shadow-sm)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-medium" style={{ color: 'var(--theme-on-surface)' }}>
                    {item.label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                    {item.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* 版本信息 */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
            罗源野抱 TOPO v1.0.0
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-on-surface-variant)' }}>
            福州罗源攀岩线路分享
          </p>
        </div>
      </main>

      {/* 底部导航栏 */}
      <AppTabbar />
    </div>
  )
}
