'use client'

import { Search } from 'lucide-react'

interface FloatingSearchProps {
  onClick: () => void
  placeholder?: string
}

export function FloatingSearch({
  onClick,
  placeholder = '搜索线路名称',
}: FloatingSearchProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-40">
      <button
        onClick={onClick}
        className="w-full h-12 flex items-center gap-3 px-4 active:scale-[0.98]"
        style={{
          backgroundColor: 'var(--theme-surface)',
          border: '1px solid var(--theme-outline)',
          borderRadius: 'var(--theme-radius-full)',
          boxShadow: 'var(--theme-shadow-lg)',
          transition: 'var(--theme-transition)',
        }}
      >
        <Search className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
        <span className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>{placeholder}</span>
      </button>
    </div>
  )
}
