'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, User, MapPin, ImageOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getGradeColor } from '@/lib/tokens'
import { getRouteTopoUrl } from '@/lib/constants'
import type { Route, Crag } from '@/types'

interface RouteDetailClientProps {
  route: Route
  crag: Crag | null
}

export default function RouteDetailClient({ route, crag }: RouteDetailClientProps) {
  const router = useRouter()
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  // 生成 TOPO 图 URL
  const topoImage = getRouteTopoUrl(route.cragId, route.name)

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-surface)',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* TOPO 图区域 */}
      <div className="relative flex-shrink-0 h-[50vh] bg-black">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* 图片加载骨架屏 */}
        {imageLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-20 h-20 rounded-xl" />
              <Skeleton className="w-32 h-4 rounded-full" />
            </div>
          </div>
        )}

        {/* 图片加载失败 */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-white/60">
              <ImageOff className="w-12 h-12" />
              <span className="text-sm">图片加载失败</span>
            </div>
          </div>
        )}

        {/* TOPO 图 */}
        <Image
          src={topoImage}
          alt={route.name}
          fill
          className={`object-contain transition-opacity duration-300 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false)
            setImageError(true)
          }}
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
        <div className="px-4 py-4" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--theme-on-surface)' }}>
            {route.name}
          </h1>

          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
            <MapPin className="w-4 h-4" />
            <span>{crag?.name || route.area}</span>
          </div>

          {/* 元信息 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {route.FA && (
              <div
                className="flex items-center gap-1 px-2 py-1"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                <User className="w-3 h-3" style={{ color: 'var(--theme-on-surface-variant)' }} />
                <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  FA: {route.FA}
                </span>
              </div>
            )}
            {route.setter && route.setter !== 'TODO' && (
              <div
                className="px-2 py-1"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  定线: {route.setter}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 线路描述 */}
        {route.description && route.description !== 'TODO' && (
          <div
            className="px-4 py-4"
            style={{ borderTop: '1px solid var(--theme-outline-variant)' }}
          >
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--theme-on-surface)' }}>
              线路说明
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {route.description}
            </p>
          </div>
        )}

        {/* 评论区占位 */}
        <div
          className="px-4 py-4"
          style={{ borderTop: '1px solid var(--theme-outline-variant)' }}
        >
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--theme-on-surface)' }}>
            评论
          </h2>
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              评论功能开发中...
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
