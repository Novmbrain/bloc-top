'use client'

import { ArrowLeft, Image as ImageIcon, Edit3, Mountain, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { useSession } from '@/lib/auth-client'

interface EditorCard {
  href: string
  icon: typeof Mountain
  title: string
  description: string
  detail: string
  adminOnly?: boolean
}

/**
 * Topo 编辑器入口 Hub 页面
 * 提供岩面管理和线路标注两个入口
 * 根据用户角色过滤可见卡片
 */
export default function TopoEditorPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as { role?: string })?.role || 'user'

  const pwaUrl = process.env.NEXT_PUBLIC_PWA_URL || 'https://bouldering.top'

  const allCards: EditorCard[] = [
    {
      href: '/crags',
      icon: Mountain,
      title: '岩场管理',
      description: '添加和编辑岩场基本信息',
      detail: '新建岩场 → 填写信息 → 保存',
    },
    {
      href: '/faces',
      icon: ImageIcon,
      title: '岩面管理',
      description: '上传和管理岩面照片',
      detail: '选择岩场 → 创建岩面 → 上传照片',
    },
    {
      href: '/routes',
      icon: Edit3,
      title: '线路标注 & Beta',
      description: '标注线路 Topo 路径，管理 Beta 视频',
      detail: '选择线路 → 画 Topo → 切换 Tab 编辑 Beta',
    },
    {
      href: '/users',
      icon: Users,
      title: '用户管理',
      description: '管理用户角色和权限',
      detail: '搜索用户 → 修改角色 → admin / 岩场创建者 / 普通用户',
      adminOnly: true,
    },
    {
      href: '/cities',
      icon: MapPin,
      title: '城市管理',
      description: '管理城市和地级市配置',
      detail: '新增城市 → 设置地级市 → 切换可用状态',
      adminOnly: true,
    },
  ]

  const cards = allCards.filter(card => {
    if (card.adminOnly && userRole !== 'admin') return false
    return true
  })

  return (
    <div
      className="min-h-screen pb-20 lg:pb-0"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      {/* Header */}
      <header
        className="glass-heavy sticky top-0 z-40 px-4 lg:px-6 py-3"
        style={{
          borderBottom: '1px solid var(--theme-outline-variant)',
        }}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <a
            href={pwaUrl}
            className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
            style={{ color: 'var(--theme-primary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </a>

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
              className="glass group block p-6 transition-all duration-300 active:scale-[0.98] hover:scale-[1.02]"
              style={{
                borderRadius: 'var(--theme-radius-xl)',
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
    </div>
  )
}
