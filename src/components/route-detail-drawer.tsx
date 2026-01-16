'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { MapPin, User, Wrench, Video, ImageIcon } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { ImageViewer } from '@/components/ui/image-viewer'
import { BetaListDrawer } from '@/components/beta-list-drawer'
import { BetaSubmitDrawer } from '@/components/beta-submit-drawer'
import { getGradeColor } from '@/lib/tokens'
import { getRouteTopoUrl } from '@/lib/constants'
import type { Route, Crag } from '@/types'

interface RouteDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  route: Route | null
  crag?: Crag | null
}

export function RouteDetailDrawer({
  isOpen,
  onClose,
  route,
  crag,
}: RouteDetailDrawerProps) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [betaListOpen, setBetaListOpen] = useState(false)
  const [betaSubmitOpen, setBetaSubmitOpen] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  // 当线路变化时重置图片加载状态
  useEffect(() => {
    if (route) {
       
      setImageLoading(true)
       
      setImageError(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅依赖 route.id 变化
  }, [route?.id])

  if (!route) return null

  const betaCount = route.betaLinks?.length || 0
  // 自动拼接 COS URL，无需依赖 route.image 字段
  const topoImageUrl = getRouteTopoUrl(route.cragId, route.name)

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} height="three-quarter">
        <div className="px-4 pb-4">
          {/* TOPO 图片区域 */}
          <div
            className="relative w-full mb-4 overflow-hidden"
            style={{
              height: '40vh',
              maxHeight: '320px',
              borderRadius: 'var(--theme-radius-xl)',
              backgroundColor: 'var(--theme-surface-variant)',
            }}
          >
            {imageError ? (
              // 图片加载失败的占位符
              <div className="w-full h-full flex flex-col items-center justify-center">
                <ImageIcon
                  className="w-12 h-12 mb-2"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  暂无 TOPO 图片
                </span>
                {/* 难度标签（无图片时） */}
                <div
                  className="absolute top-3 right-3 px-3 py-1.5"
                  style={{
                    backgroundColor: getGradeColor(route.grade),
                    borderRadius: 'var(--theme-radius-full)',
                  }}
                >
                  <span className="text-white text-sm font-bold">{route.grade}</span>
                </div>
              </div>
            ) : (
              // 正常显示图片（带 loading 状态）
              <button
                onClick={() => setImageViewerOpen(true)}
                className="relative w-full h-full group"
                aria-label="点击放大图片"
              >
                {/* 加载中骨架屏 */}
                {imageLoading && (
                  <div className="absolute inset-0 skeleton-shimmer" />
                )}
                <Image
                  src={topoImageUrl}
                  alt={route.name}
                  fill
                  className={`object-cover transition-all duration-300 group-active:scale-[0.98] ${
                    imageLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false)
                    setImageError(true)
                  }}
                />
                {/* 难度标签 */}
                <div
                  className="absolute top-3 right-3 px-3 py-1.5"
                  style={{
                    backgroundColor: getGradeColor(route.grade),
                    borderRadius: 'var(--theme-radius-full)',
                  }}
                >
                  <span className="text-white text-sm font-bold">{route.grade}</span>
                </div>
                {/* 放大提示（图片加载完成后显示） */}
                {!imageLoading && (
                  <div
                    className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm"
                    style={{ borderRadius: 'var(--theme-radius-md)' }}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                    <span className="text-white text-xs">点击放大</span>
                  </div>
                )}
              </button>
            )}
          </div>

          {/* 线路信息 */}
          <div className="mb-4">
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              {route.name}
            </h2>

            {/* 位置信息 */}
            <div className="flex items-center gap-4 flex-wrap">
              {crag && (
                <div className="flex items-center gap-1.5">
                  <MapPin
                    className="w-4 h-4"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    {crag.name} · {route.area}
                  </span>
                </div>
              )}
              {!crag && route.area && (
                <div className="flex items-center gap-1.5">
                  <MapPin
                    className="w-4 h-4"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    {route.area}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* FA 和定线者信息 */}
          {(route.FA || route.setter) && (
            <div
              className="flex flex-wrap gap-4 p-3 mb-4"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                borderRadius: 'var(--theme-radius-lg)',
              }}
            >
              {route.FA && (
                <div className="flex items-center gap-2">
                  <User
                    className="w-4 h-4"
                    style={{ color: 'var(--theme-primary)' }}
                  />
                  <div>
                    <span
                      className="text-xs block"
                      style={{ color: 'var(--theme-on-surface-variant)' }}
                    >
                      FA (首攀)
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--theme-on-surface)' }}
                    >
                      {route.FA}
                    </span>
                  </div>
                </div>
              )}
              {route.setter && (
                <div className="flex items-center gap-2">
                  <Wrench
                    className="w-4 h-4"
                    style={{ color: 'var(--theme-primary)' }}
                  />
                  <div>
                    <span
                      className="text-xs block"
                      style={{ color: 'var(--theme-on-surface-variant)' }}
                    >
                      定线者
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--theme-on-surface)' }}
                    >
                      {route.setter}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 描述 */}
          {route.description && (
            <div className="mb-4">
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                描述
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                {route.description}
              </p>
            </div>
          )}

          {/* Beta 按钮 */}
          <button
            onClick={() => setBetaListOpen(true)}
            className="w-full py-3 px-4 flex items-center justify-between transition-transform active:scale-[0.98]"
            style={{
              backgroundColor: betaCount > 0
                ? 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))'
                : 'var(--theme-surface-variant)',
              borderRadius: 'var(--theme-radius-xl)',
              border: betaCount > 0
                ? '1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent)'
                : '1px solid var(--theme-outline-variant)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: betaCount > 0
                    ? 'var(--theme-primary)'
                    : 'var(--theme-outline)',
                }}
              >
                <Video className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <span
                  className="text-sm font-medium block"
                  style={{ color: 'var(--theme-on-surface)' }}
                >
                  Beta 视频
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {betaCount > 0 ? `${betaCount} 个视频` : '暂无视频'}
                </span>
              </div>
            </div>
            {betaCount > 0 && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                }}
              >
                {betaCount}
              </div>
            )}
          </button>
        </div>
      </Drawer>

      {/* 图片查看器 */}
      {!imageError && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          src={topoImageUrl}
          alt={route.name}
        />
      )}

      {/* Beta 列表抽屉 */}
      <BetaListDrawer
        isOpen={betaListOpen}
        onClose={() => setBetaListOpen(false)}
        betaLinks={route.betaLinks || []}
        routeName={route.name}
        routeId={route.id}
        onAddBeta={() => {
          setBetaListOpen(false)
          setBetaSubmitOpen(true)
        }}
      />

      {/* Beta 提交抽屉 */}
      <BetaSubmitDrawer
        isOpen={betaSubmitOpen}
        onClose={() => setBetaSubmitOpen(false)}
        routeId={route.id}
        routeName={route.name}
        onSuccess={() => {
          // TODO: 可以触发数据刷新
        }}
      />
    </>
  )
}
