import { getAllRoutes, getAllCrags } from '@/lib/db'
import RouteListClient from './route-client'

// ISR: 每小时重新验证一次
export const revalidate = 3600

/**
 * 线路列表页面
 *
 * 注意：这里故意不使用 Suspense 包裹 RouteListClient
 * 因为 RouteListClient 内部使用了 useSearchParams，
 * 如果被 Suspense 包裹，每次 URL 参数变化都会触发 fallback 显示，导致闪烁。
 *
 * ISR 缓存确保数据获取几乎是即时的，所以不需要 loading 状态。
 */
export default async function RouteListPage() {
  // 并行获取所有数据
  const [routes, crags] = await Promise.all([
    getAllRoutes(),
    getAllCrags(),
  ])

  return <RouteListClient routes={routes} crags={crags} />
}
