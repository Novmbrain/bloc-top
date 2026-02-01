'use client'

import { ArrowLeft, Image as ImageIcon, Edit3 } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { AppTabbar } from '@/components/app-tabbar'

/**
 * Topo 编辑器入口 Hub 页面
 * 提供岩面管理和线路标注两个入口
 */
export default function TopoEditorPage() {
  const cards = [
    {
      href: '/editor/faces' as const,
      icon: ImageIcon,
      title: '岩面管理',
      description: '上传和管理岩面照片',
      detail: '选择岩场 → 创建岩面 → 上传照片',
    },
    {
      href: '/editor/routes' as const,
      icon: Edit3,
      title: '线路标注',
      description: '标注线路攀爬路径',
      detail: '选择岩面 → 选择线路 → 画 Topo 路线',
    },
  ]

  return (
    <div
      className="min-h-screen pb-20 lg:pb-0"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 lg:px-6 py-3 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-surface) 85%, transparent)',
          borderBottom: '1px solid var(--theme-outline-variant)',
        }}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
            style={{ color: 'var(--theme-primary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </Link>

          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            <h1
              className="text-lg font-bold"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              Topo 编辑器
            </h1>
          </div>

          <div className="w-20" />
        </div>
      </header>

      {/* Cards */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group block p-6 transition-all duration-300 active:scale-[0.98] hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                borderRadius: 'var(--theme-radius-xl)',
                boxShadow: 'var(--theme-shadow-md)',
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
                }}
              >
                <card.icon
                  className="w-7 h-7"
                  style={{ color: 'var(--theme-primary)' }}
                />
              </div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                {card.title}
              </h2>
              <p
                className="text-sm mb-2"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                {card.description}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--theme-on-surface-variant)', opacity: 0.7 }}
              >
                {card.detail}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="lg:hidden">
        <AppTabbar />
      </div>
    </div>
  )
}
