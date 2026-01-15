'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import { CragCard } from '@/components/crag-card'
import { getAllCrags } from '@/data/crags'

export default function HomePage() {
  const crags = getAllCrags()
  const [isLoading] = useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden px-4 bg-[var(--m3-surface)]">
      {/* 头部区域 */}
      <header className="pt-12 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold text-[var(--m3-on-surface)] tracking-wide leading-tight">
              罗源
            </h1>
            <div className="w-16 h-0.5 mt-1 mb-3 bg-gradient-to-r from-[var(--m3-primary)] to-transparent" />
          </div>

          {/* 用户头像 */}
          <button className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--m3-surface-variant)] flex items-center justify-center transition-transform active:scale-95">
            <User className="w-5 h-5 text-[var(--m3-on-surface-variant)]" />
          </button>
        </div>
      </header>

      {/* 岩场列表（可滚动区域） */}
      <main className="flex-1 overflow-y-auto pb-20">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--m3-primary)] border-t-transparent" />
            <span className="ml-2 text-sm text-[var(--m3-on-surface-variant)]">
              加载中...
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {crags.map((crag, index) => (
              <CragCard key={crag.id} crag={crag} index={index} />
            ))}
          </div>
        )}

        {/* 底部提示 */}
        <div className="text-center py-4">
          <span className="text-xs text-[var(--m3-outline)]">
            更多岩场正在向你爬来，请耐心等待
          </span>
        </div>
      </main>
    </div>
  )
}
