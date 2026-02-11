import { getAllCrags, getAllRoutes } from '@/lib/db'
import HomePageClient from './home-client'

// ISR: 每月重新验证 - 配置见 @/lib/cache-config.ts
export const revalidate = 2592000 // 30 天 (秒)

/**
 * 首页 - 岩场列表
 *
 * 注意：这里故意不使用 Suspense 包裹 HomePageClient
 * 因为 ISR 缓存确保数据获取几乎是即时的，
 * 如果使用 Suspense，每次导航都会短暂触发 fallback，导致骨架屏闪烁。
 *
 * loading.tsx 仅用于首次加载（冷启动）时的路由级加载状态。
 * 后续导航将直接从 ISR 缓存返回完整 HTML，无需骨架屏。
 */
export default async function HomePage() {
  // 并行获取所有数据
  const [crags, allRoutes] = await Promise.all([
    getAllCrags(),
    getAllRoutes(),
  ])

  // 裁剪 Route 数据，去除首页不需要的大字段 (description, image, setter)
  // 减少 Server→Client RSC payload 大小
  // 注意：保留 topoLine，因为首页搜索打开 RouteDetailDrawer 需要用它渲染 Topo 线条
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lightRoutes = allRoutes.map(({ description, image, setter, ...rest }) => rest)

  return <HomePageClient crags={crags} allRoutes={lightRoutes} />
}
