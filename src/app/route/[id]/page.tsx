import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRouteById, getAllRoutes } from '@/data/routes'
import { getCragById } from '@/data/crags'
import RouteDetailClient from './route-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  const routes = getAllRoutes()
  return routes.map((route) => ({
    id: String(route.id),
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const route = getRouteById(parseInt(id))

  if (!route) {
    return {
      title: '线路不存在 - 罗源野抱 TOPO',
    }
  }

  const crag = getCragById(route.cragId)
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
  const route = getRouteById(parseInt(id))

  if (!route) {
    notFound()
  }

  const crag = getCragById(route.cragId)

  return <RouteDetailClient route={route} crag={crag ?? null} />
}
