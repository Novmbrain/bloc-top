import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCragById, getAllCrags, getRoutesByCragId } from '@/lib/db'
import CragDetailClient from './crag-detail-client'

// ISR: 每月重新验证 - 配置见 @/lib/cache-config.ts
export const revalidate = 2592000 // 30 天 (秒)

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  const crags = await getAllCrags()
  return crags.map((crag) => ({
    id: crag.id,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const crag = await getCragById(id)

  if (!crag) {
    return {
      title: '岩场不存在 - 罗源野抱 TOPO',
    }
  }

  return {
    title: `${crag.name} - 罗源野抱 TOPO`,
    description: crag.description.slice(0, 160),
    openGraph: {
      title: `${crag.name} - 罗源攀岩`,
      description: crag.description.slice(0, 160),
      type: 'article',
    },
  }
}

export default async function CragDetailPage({ params }: PageProps) {
  const { id } = await params
  const crag = await getCragById(id)
  const routes = await getRoutesByCragId(id)

  if (!crag) {
    notFound()
  }

  return <CragDetailClient crag={crag} routes={routes} />
}
