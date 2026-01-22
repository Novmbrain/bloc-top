import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRouteById, getAllRoutes, getCragById } from '@/lib/db'
import RouteDetailClient from './route-detail-client'

// ISR: 每月重新验证 - 配置见 @/lib/cache-config.ts
export const revalidate = 2592000 // 30 天 (秒)

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  const routes = await getAllRoutes()
  return routes.map((route) => ({
    id: String(route.id),
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const route = await getRouteById(parseInt(id))

  if (!route) {
    return {
      title: '线路不存在 - 罗源野抱 TOPO',
    }
  }

  const crag = await getCragById(route.cragId)
  const description = route.description || `${route.name} (${route.grade}) - ${crag?.name || route.area}`

  return {
    title: `${route.name} ${route.grade} - 罗源野抱 TOPO`,
    description: description.slice(0, 160),
    openGraph: {
      title: `${route.name} ${route.grade} - 罗源攀岩`,
      description: description.slice(0, 160),
      type: 'article',
    },
  }
}

export default async function RouteDetailPage({ params }: PageProps) {
  const { id } = await params
  const route = await getRouteById(parseInt(id))

  if (!route) {
    notFound()
  }

  const crag = await getCragById(route.cragId)

  return <RouteDetailClient route={route} crag={crag ?? null} />
}
