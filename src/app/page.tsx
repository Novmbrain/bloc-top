import { Suspense } from 'react'
import { getAllCrags, getAllRoutes } from '@/lib/db'
import { CragCardSkeleton } from '@/components/crag-card-skeleton'
import HomePageClient from './home-client'

// ISR: 每月重新验证 - 配置见 @/lib/cache-config.ts
export const revalidate = 2592000 // 30 天 (秒)

async function HomePageContent() {
  // 并行获取所有数据
  const [crags, allRoutes] = await Promise.all([
    getAllCrags(),
    getAllRoutes(),
  ])

  return <HomePageClient crags={crags} allRoutes={allRoutes} />
}

export default async function HomePage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex flex-col h-screen overflow-hidden px-4"
          style={{
            backgroundColor: 'var(--theme-surface)',
            transition: 'var(--theme-transition)',
          }}
        >
          {/* 头部骨架 */}
          <header className="pt-12 pb-3">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                {/* 标题骨架 */}
                <div
                  className="h-10 w-20 rounded-lg mb-1"
                  style={{ backgroundColor: 'var(--theme-surface-variant)' }}
                />
                {/* 下划线骨架 */}
                <div
                  className="w-16 h-0.5 mt-1 mb-3"
                  style={{ backgroundColor: 'var(--theme-surface-variant)' }}
                />
              </div>
              {/* 用户头像骨架 */}
              <div
                className="w-10 h-10 rounded-full"
                style={{ backgroundColor: 'var(--theme-surface-variant)' }}
              />
            </div>
          </header>

          {/* 岩场卡片骨架 */}
          <main className="flex-1 overflow-y-auto pb-36">
            <CragCardSkeleton count={3} />
          </main>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  )
}
