import { cookies } from 'next/headers'
import { getCragsByCityId, getRoutesByCityId, getAllCities, getAllPrefectures } from '@/lib/db'
import { isCityValid, DEFAULT_CITY_ID, CITY_COOKIE_NAME } from '@/lib/city-utils'
import HomePageClient from './home-client'

/**
 * 首页 - 岩场列表
 *
 * 使用 cookie 读取用户选择的城市，服务端直接过滤数据。
 * cookies() 使页面变为动态渲染，ISR revalidate 不再需要。
 * 缓解措施：PWA SW NetworkFirst 策略 + React cache() 请求内去重。
 */
export default async function HomePage() {
  // 并行获取城市配置（cache() 去重，同一请求只查一次 DB）
  const [cities, prefectures] = await Promise.all([
    getAllCities(),
    getAllPrefectures(),
  ])

  // 从 cookie 读取城市，无效值兜底默认城市
  const cookieStore = await cookies()
  const rawCity = cookieStore.get(CITY_COOKIE_NAME)?.value
  const cityId = rawCity && isCityValid(cities, rawCity) ? rawCity : DEFAULT_CITY_ID

  // 并行获取城市级数据
  const [crags, allRoutes] = await Promise.all([
    getCragsByCityId(cityId),
    getRoutesByCityId(cityId),
  ])

  // 裁剪 Route 数据，去除首页不需要的大字段 (description, image, setter)
  // 减少 Server→Client RSC payload 大小
  // 注意：保留 topoLine，因为首页搜索打开 RouteDetailDrawer 需要用它渲染 Topo 线条
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lightRoutes = allRoutes.map(({ description, image, setter, ...rest }) => rest)

  return (
    <HomePageClient
      crags={crags}
      allRoutes={lightRoutes}
      serverCityId={cityId}
      cities={cities}
      prefectures={prefectures}
    />
  )
}
