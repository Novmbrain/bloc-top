'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, User, MapPin } from 'lucide-react'
import { getRouteById } from '@/data/routes'
import { getCragById } from '@/data/crags'
import { getGradeColor } from '@/lib/tokens'

const COS_BASE_URL = 'https://topo-image-1305178596.cos.ap-guangzhou.myqcloud.com'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function RouteDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const route = getRouteById(parseInt(id))
  const crag = route ? getCragById(route.cragId) : null

  if (!route) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-[var(--m3-on-surface-variant)]">线路不存在</p>
      </div>
    )
  }

  // 生成 TOPO 图 URL
  const topoImage = `${COS_BASE_URL}/${route.cragId}/${encodeURIComponent(route.name)}.jpg`

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--m3-surface)]">
      {/* TOPO 图区域 */}
      <div className="relative flex-shrink-0 h-[50vh] bg-black">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* TOPO 图 */}
        <Image
          src={topoImage}
          alt={route.name}
          fill
          className="object-contain"
          unoptimized
        />

        {/* 难度标签 */}
        <div
          className="absolute top-12 right-4 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: getGradeColor(route.grade) }}
        >
          <span className="text-white font-bold text-sm">{route.grade}</span>
        </div>
      </div>

      {/* 内容区域 */}
      <main className="flex-1 overflow-y-auto">
        {/* 线路信息 */}
        <div className="px-4 py-4 bg-white">
          <h1 className="text-2xl font-bold text-[var(--m3-on-surface)] mb-1">
            {route.name}
          </h1>

          <div className="flex items-center gap-2 text-sm text-[var(--m3-on-surface-variant)]">
            <MapPin className="w-4 h-4" />
            <span>{crag?.name || route.area}</span>
          </div>

          {/* 元信息 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {route.FA && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--m3-surface-variant)]">
                <User className="w-3 h-3 text-[var(--m3-on-surface-variant)]" />
                <span className="text-xs text-[var(--m3-on-surface-variant)]">
                  FA: {route.FA}
                </span>
              </div>
            )}
            {route.setter && route.setter !== 'TODO' && (
              <div className="px-2 py-1 rounded-full bg-[var(--m3-surface-variant)]">
                <span className="text-xs text-[var(--m3-on-surface-variant)]">
                  定线: {route.setter}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 线路描述 */}
        {route.description && route.description !== 'TODO' && (
          <div className="px-4 py-4 border-t border-[var(--m3-outline-variant)]">
            <h2 className="text-sm font-semibold text-[var(--m3-on-surface)] mb-2">
              线路说明
            </h2>
            <p className="text-sm text-[var(--m3-on-surface-variant)] leading-relaxed">
              {route.description}
            </p>
          </div>
        )}

        {/* 评论区占位 */}
        <div className="px-4 py-4 border-t border-[var(--m3-outline-variant)]">
          <h2 className="text-sm font-semibold text-[var(--m3-on-surface)] mb-2">
            评论
          </h2>
          <div className="text-center py-8">
            <p className="text-sm text-[var(--m3-outline)]">
              评论功能开发中...
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
