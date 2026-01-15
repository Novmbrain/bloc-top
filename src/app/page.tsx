'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User } from 'lucide-react'
import { CragCard } from '@/components/crag-card'
import { CragCardSkeleton } from '@/components/crag-card-skeleton'
import { FloatingSearch } from '@/components/floating-search'
import { SearchOverlay } from '@/components/search-overlay'
import { AppTabbar } from '@/components/app-tabbar'
import { InstallPrompt } from '@/components/install-prompt'
import { useRouteSearch } from '@/hooks/use-route-search'
import { getAllCrags } from '@/data/crags'
import { getAllRoutes } from '@/data/routes'

export default function HomePage() {
  const crags = getAllCrags()
  const allRoutes = getAllRoutes()
  const [isLoading] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const { searchQuery, setSearchQuery, searchResults, clearSearch } =
    useRouteSearch(allRoutes, { limit: 0 })

  const handleCloseSearch = () => {
    setIsSearchOpen(false)
    setTimeout(() => clearSearch(), 300)
  }

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
          <Link
            href="/profile"
            className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--m3-surface-variant)] flex items-center justify-center transition-transform active:scale-95"
          >
            <User className="w-5 h-5 text-[var(--m3-on-surface-variant)]" />
          </Link>
        </div>
      </header>

      {/* 岩场列表（可滚动区域） */}
      <main className="flex-1 overflow-y-auto pb-36">
        {/* PWA 安装提示 */}
        <InstallPrompt />

        {isLoading ? (
          <CragCardSkeleton count={4} />
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

      {/* 浮动搜索框 */}
      <FloatingSearch onClick={() => setIsSearchOpen(true)} />

      {/* 搜索覆盖层 */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        results={searchResults}
        allRoutes={allRoutes}
      />

      {/* 底部导航栏 */}
      <AppTabbar />
    </div>
  )
}
