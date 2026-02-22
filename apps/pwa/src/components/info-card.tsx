import { memo } from 'react'

interface InfoCardProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  content: string
  delay?: number
}

/**
 * 通用信息卡片 — 图标 + 标题 + 正文
 *
 * 用于岩场详情页和离线岩场详情页中的岩场介绍、前往方式等信息展示。
 */
export const InfoCard = memo(function InfoCard({ icon, iconBg, title, content, delay = 0 }: InfoCardProps) {
  return (
    <div
      className="glass p-3 mb-2 animate-fade-in-up"
      style={{
        borderRadius: 'var(--theme-radius-xl)',
        animationDelay: `${delay}ms`,
        transition: 'var(--theme-transition)',
      }}
    >
      <div className="flex items-center mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <span className="text-base font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
          {title}
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-on-surface-variant)' }}>
        {content}
      </p>
    </div>
  )
})
