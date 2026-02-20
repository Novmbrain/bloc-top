'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { MapPin, User, Wrench, Video, ImageIcon, ZoomIn, X, Eye, EyeOff } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { ImageViewer } from '@/components/ui/image-viewer'

const BetaListDrawer = dynamic(() =>
  import('@/components/beta-list-drawer').then(m => ({ default: m.BetaListDrawer })),
  { ssr: false }
)
const BetaSubmitDrawer = dynamic(() =>
  import('@/components/beta-submit-drawer').then(m => ({ default: m.BetaSubmitDrawer })),
  { ssr: false }
)
import { ContextualHint } from '@/components/contextual-hint'
import { TopoLineOverlay, type TopoLineOverlayRef } from '@/components/topo-line-overlay'
import { MultiTopoLineOverlay, type MultiTopoLineOverlayRef, type MultiTopoRoute } from '@/components/multi-topo-line-overlay'
import { RouteLegendPanel } from '@/components/route-legend-panel'
import { getGradeColor } from '@/lib/tokens'
import { vToFont } from '@/lib/grade-utils'
import { TOPO_ANIMATION_CONFIG } from '@/lib/topo-constants'
import { useFaceImage, useFaceImageCache } from '@/hooks/use-face-image'
import { getTopoAnnotations } from '@/lib/topo-annotations'
import type { RouteTopoAnnotation } from '@bloctop/shared/types'
import type { Route, Crag, BetaLink } from '@/types'

interface AnnotationSlideProps {
  annotation: RouteTopoAnnotation
  cragId: string
  routeColor: string
  routeName: string
  imageAspectRatio: number | undefined
  setImageAspectRatio: (r: number) => void
  onClick: () => void
}

function AnnotationSlide({
  annotation, cragId, routeColor, routeName, imageAspectRatio, setImageAspectRatio, onClick,
}: AnnotationSlideProps) {
  const { src, isLoading, isError, onLoad, onError } = useFaceImage({
    cragId,
    area: annotation.area,
    faceId: annotation.faceId,
  })

  return (
    <button
      className="relative flex-none w-full h-full snap-start"
      onClick={onClick}
      aria-label="点击放大"
    >
      {isLoading && <div className="absolute inset-0 skeleton-shimmer" />}
      {!isError && src && (
        <Image
          src={src}
          alt={routeName}
          fill
          className={`object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          sizes="(max-width: 768px) 100vw, 50vw"
          onLoad={(e) => {
            onLoad()
            const img = e.currentTarget as HTMLImageElement
            if (img.naturalWidth && img.naturalHeight) {
              setImageAspectRatio(img.naturalWidth / img.naturalHeight)
            }
          }}
          onError={onError}
        />
      )}
      {!isLoading && annotation.topoLine.length >= 2 && (
        <TopoLineOverlay
          points={annotation.topoLine}
          color={routeColor}
          tension={annotation.topoTension}
          objectFit="contain"
          aspectRatio={imageAspectRatio}
        />
      )}
    </button>
  )
}

interface RouteDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  route: Route | null
  /** 同一岩面的其他线路（用于多线路叠加显示） */
  siblingRoutes?: Route[]
  crag?: Crag | null
  /** 线路切换回调 */
  onRouteChange?: (route: Route) => void
}

export function RouteDetailDrawer({
  isOpen,
  onClose,
  route,
  siblingRoutes,
  crag,
  onRouteChange,
}: RouteDetailDrawerProps) {
  const t = useTranslations('RouteDetail')
  const tCommon = useTranslations('Common')
  const tBeta = useTranslations('Beta')
  const tIntro = useTranslations('Intro')
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [betaListOpen, setBetaListOpen] = useState(false)
  const [betaSubmitOpen, setBetaSubmitOpen] = useState(false)

  // 统一图片缓存层: 替代手动的 imageLoading/imageError/prevImageUrlRef
  const {
    src: topoImageUrl,
    isLoading: imageLoading,
    isError: imageError,
    onLoad: handleImageLoad,
    onError: handleImageError,
  } = useFaceImage(route)

  // 图片真实宽高比（用于动态 viewBox）
  const [imageAspectRatio, setImageAspectRatio] = useState<number | undefined>(undefined)

  // 本地 Beta 数据状态，用于绕过 ISR 缓存实现即时更新
  const [localBetaLinks, setLocalBetaLinks] = useState<BetaLink[] | null>(null)

  // 用户手动切换「显示全部叠加线路」（仅 >3 条时需要）
  const [showAllOverlay, setShowAllOverlay] = useState(false)

  // 多图轮播状态
  const [activeAnnotationIndex, setActiveAnnotationIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Topo 线路 overlay refs (用于触发动画)
  const drawerOverlayRef = useRef<TopoLineOverlayRef>(null)
  const fullscreenOverlayRef = useRef<TopoLineOverlayRef>(null)
  const multiOverlayRef = useRef<MultiTopoLineOverlayRef>(null)
  const multiFullscreenOverlayRef = useRef<MultiTopoLineOverlayRef>(null)

  // 抽屉内动画是否已播放
  const [drawerAnimated, setDrawerAnimated] = useState(false)

  // 线路颜色 (基于难度等级)
  const routeColor = useMemo(
    () => route ? getGradeColor(route.grade) : '#888888',
    [route]
  )

  // 是否有 Topo 线路数据
  const hasTopoLine = route?.topoLine && route.topoLine.length >= 2

  // 多图标注支持（兼容旧字段）
  const topoAnnotations = route ? getTopoAnnotations(route) : []
  const hasMultiAnnotations = topoAnnotations.length > 1

  // 过滤出有效的同岩面线路（有 topoLine 数据的）
  const validSiblingRoutes = useMemo((): MultiTopoRoute[] => {
    if (!siblingRoutes || siblingRoutes.length <= 1) return []
    return siblingRoutes
      .filter(r => r.topoLine && r.topoLine.length >= 2)
      .map(r => ({
        id: r.id,
        name: r.name,
        grade: r.grade,
        topoLine: r.topoLine!,
        topoTension: r.topoTension,
      }))
  }, [siblingRoutes])

  // 是否有可用的多线路数据
  const hasMultiLines = validSiblingRoutes.length > 1 && hasTopoLine

  // 智能默认：≤3 条线路默认全部显示，>3 条需要用户手动切换
  const shouldShowAllByDefault = validSiblingRoutes.length <= 3
  const effectiveShowAll = shouldShowAllByDefault || showAllOverlay

  // 是否使用多线路模式
  const useMultiLineMode = hasMultiLines && effectiveShowAll

  // 当线路变化时重置非图片状态 (图片状态由 useFaceImage 自动管理)
  useEffect(() => {
    if (route) {
      setLocalBetaLinks(null)
      setDrawerAnimated(false)
      setImageAspectRatio(undefined)
      setActiveAnnotationIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅依赖 route.id 变化
  }, [route?.id])

  // 抽屉打开 + 图片加载完成时触发动画（单线路模式）
  useEffect(() => {
    if (isOpen && !imageLoading && !drawerAnimated && route?.topoLine && !useMultiLineMode) {
      const timer = setTimeout(() => {
        drawerOverlayRef.current?.replay()
        setDrawerAnimated(true)
      }, TOPO_ANIMATION_CONFIG.autoPlayDelayDrawer)
      return () => clearTimeout(timer)
    }
  }, [isOpen, imageLoading, drawerAnimated, route?.topoLine, useMultiLineMode])

  // 全屏查看器打开时触发动画（仅单线路模式需要手动触发，多线路模式由组件内部 useEffect 自动处理）
  useEffect(() => {
    if (imageViewerOpen && route?.topoLine && !useMultiLineMode) {
      const timer = setTimeout(() => {
        fullscreenOverlayRef.current?.replay()
      }, TOPO_ANIMATION_CONFIG.autoPlayDelayFullscreen)
      return () => clearTimeout(timer)
    }
  }, [imageViewerOpen, route?.topoLine, useMultiLineMode])

  // 从 API 获取最新 Beta 数据
  const fetchLatestBetas = useCallback(async (skipCache = false) => {
    if (!route) return
    try {
      const res = await fetch(`/api/beta?routeId=${route.id}`,
        skipCache ? { cache: 'no-cache' } : undefined
      )
      const data = await res.json()
      if (data.success && data.betaLinks) {
        setLocalBetaLinks(data.betaLinks)
      }
    } catch (err) {
      console.error('[RouteDetailDrawer] Failed to fetch betas:', err)
    }
  }, [route])

  // 处理线路切换
  const handleRouteSelect = useCallback((routeId: number) => {
    const newRoute = siblingRoutes?.find(r => r.id === routeId)
    if (newRoute && onRouteChange) {
      onRouteChange(newRoute)
    }
  }, [siblingRoutes, onRouteChange])

  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return
    const el = carouselRef.current
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveAnnotationIndex(index)
  }, [])

  const scrollToAnnotation = useCallback((index: number) => {
    if (!carouselRef.current) return
    carouselRef.current.scrollTo({ left: index * carouselRef.current.clientWidth, behavior: 'smooth' })
  }, [])

  // 多图标注时用于 ImageViewer URL 生成
  const faceImageCache = useFaceImageCache()

  if (!route) return null

  // 使用本地数据（如果有）或 props 数据
  const betaLinks = localBetaLinks ?? route.betaLinks ?? []
  const betaCount = betaLinks.length

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} height="full" showHandle>
        <div className="px-4 pb-4">
          {/* TOPO 图片区域 */}
          <div
            className="relative w-full mb-4 overflow-hidden"
            style={{
              height: '50vh',
              maxHeight: '400px',
              borderRadius: 'var(--theme-radius-xl)',
              backgroundColor: 'var(--theme-surface-variant)',
            }}
          >
            {hasMultiAnnotations ? (
              /* 多图轮播模式 */
              <>
                <div
                  className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                >
                  {topoAnnotations.map((annotation, index) => (
                    <AnnotationSlide
                      key={`${annotation.faceId}-${index}`}
                      annotation={annotation}
                      cragId={route.cragId}
                      routeColor={routeColor}
                      routeName={route.name}
                      imageAspectRatio={imageAspectRatio}
                      setImageAspectRatio={setImageAspectRatio}
                      onClick={() => setImageViewerOpen(true)}
                    />
                  ))}
                </div>
                {/* 页码圆点 */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                  {topoAnnotations.map((_, index) => (
                    <button
                      key={index}
                      className={`w-1.5 h-1.5 rounded-full transition-colors pointer-events-auto ${
                        index === activeAnnotationIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                      onClick={() => scrollToAnnotation(index)}
                      aria-label={`切换到角度${index + 1}`}
                    />
                  ))}
                </div>
                {/* 关闭按钮 */}
                <button
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm transition-transform active:scale-95"
                  onClick={onClose}
                  aria-label={tCommon('close')}
                >
                  <X className="w-4.5 h-4.5 text-white" />
                </button>
              </>
            ) : imageError ? (
              /* 单图加载失败 */
              <div className="w-full h-full flex flex-col items-center justify-center">
                <ImageIcon
                  className="w-12 h-12 mb-2"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {t('noTopo')}
                </span>
              </div>
            ) : (
              /* 单图正常模式（原有代码不变） */
              <button
                onClick={() => setImageViewerOpen(true)}
                className="relative w-full h-full group"
                aria-label={t('clickToEnlarge')}
              >
                {/* 加载中骨架屏 */}
                {imageLoading && (
                  <div className="absolute inset-0 skeleton-shimmer" />
                )}
                <Image
                  src={topoImageUrl!}
                  alt={route.name}
                  fill
                  className={`object-contain transition-all duration-300 group-active:scale-[0.98] ${
                    imageLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onLoad={(e) => {
                    handleImageLoad()
                    const img = e.currentTarget as HTMLImageElement
                    if (img.naturalWidth && img.naturalHeight) {
                      setImageAspectRatio(img.naturalWidth / img.naturalHeight)
                    }
                  }}
                  onError={handleImageError}
                />

                {/* Topo 线路叠加层 */}
                {hasTopoLine && !imageLoading && (
                  useMultiLineMode ? (
                    <MultiTopoLineOverlay
                      ref={multiOverlayRef}
                      routes={validSiblingRoutes}
                      selectedRouteId={route.id}
                      onRouteSelect={handleRouteSelect}
                      objectFit="contain"
                      aspectRatio={imageAspectRatio}
                    />
                  ) : (
                    <TopoLineOverlay
                      ref={drawerOverlayRef}
                      points={route.topoLine!}
                      color={routeColor}
                      tension={route.topoTension}
                      animated
                      objectFit="contain"
                      aspectRatio={imageAspectRatio}
                    />
                  )
                )}

                {/* 浮动关闭按钮（图片右上角） */}
                {!imageLoading && (
                  <div
                    className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm transition-transform active:scale-95"
                    onClick={(e) => {
                      e.stopPropagation()
                      onClose()
                    }}
                    role="button"
                    aria-label={tCommon('close')}
                  >
                    <X className="w-4.5 h-4.5 text-white" />
                  </div>
                )}

                {/* "显示全部/仅看当前" 浮动按钮（图片左下角，仅 >3 条线路时） */}
                {!imageLoading && hasMultiLines && !shouldShowAllByDefault && (
                  <div
                    className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 backdrop-blur-sm transition-all duration-200 active:scale-95"
                    style={{
                      borderRadius: 'var(--theme-radius-md)',
                      backgroundColor: showAllOverlay
                        ? 'color-mix(in srgb, var(--theme-primary) 60%, rgba(0,0,0,0.3))'
                        : 'rgba(0,0,0,0.5)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAllOverlay(prev => !prev)
                    }}
                    role="button"
                  >
                    {showAllOverlay ? (
                      <EyeOff className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-white" />
                    )}
                    <span className="text-white text-xs font-medium">
                      {showAllOverlay ? t('showCurrentOnly') : t('showAllRoutes')}
                    </span>
                  </div>
                )}

                {/* 放大提示（图片加载完成后显示） */}
                {!imageLoading && (
                  <div
                    className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm"
                    style={{ borderRadius: 'var(--theme-radius-md)' }}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                    <span className="text-white text-xs">{t('tapToZoom')}</span>
                  </div>
                )}
              </button>
            )}
          </div>

          {/* 同岩面线路图例面板 */}
          {hasMultiLines && (
            <RouteLegendPanel
              routes={validSiblingRoutes}
              selectedRouteId={route.id}
              onRouteSelect={handleRouteSelect}
            />
          )}

          {/* 线路信息 */}
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-2">
              {/* 难度标签 */}
              <span
                className="px-2.5 py-1 text-sm font-bold text-white shrink-0"
                style={{
                  backgroundColor: getGradeColor(route.grade),
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                {route.grade}
              </span>
              {vToFont(route.grade) && (
                <span
                  className="text-sm shrink-0"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {vToFont(route.grade)}
                </span>
              )}
              <h2
                className="text-2xl font-bold"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                {route.name}
              </h2>
            </div>

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
              className="flex flex-wrap gap-4 p-3 mb-4 glass-light"
              style={{
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
                      {t('faLabel')}
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
                      {t('setter')}
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
                {t('descriptionLabel')}
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
            className="w-full py-3 px-4 flex items-center justify-between transition-transform active:scale-[0.98] glass-light"
            style={{
              borderRadius: 'var(--theme-radius-xl)',
              border: betaCount > 0
                ? '1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent)'
                : undefined,
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
                  {tBeta('title')}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {betaCount > 0 ? tBeta('videoCount', { count: betaCount }) : tBeta('noVideo')}
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

      {/* 图片查看器（带 Topo 线路叠加） */}
      {(hasMultiAnnotations || !imageError) && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          src={
            hasMultiAnnotations
              ? faceImageCache.getImageUrl({
                  cragId: route.cragId,
                  area: topoAnnotations[activeAnnotationIndex]?.area ?? '',
                  faceId: topoAnnotations[activeAnnotationIndex]?.faceId ?? '',
                })
              : topoImageUrl!
          }
          alt={route.name}
          images={hasMultiAnnotations ? topoAnnotations.map(a =>
            faceImageCache.getImageUrl({ cragId: route.cragId, area: a.area, faceId: a.faceId })
          ) : undefined}
          activeImageIndex={hasMultiAnnotations ? activeAnnotationIndex : undefined}
          onImageChange={hasMultiAnnotations ? (index) => {
            setActiveAnnotationIndex(index)
            scrollToAnnotation(index)
          } : undefined}
          topSlot={
            <div className="absolute top-12 left-4 right-4 z-10 flex items-start justify-between">
              <ContextualHint
                hintKey="topo-pinch-zoom"
                message={tIntro('hintPinchZoom')}
                icon={<ZoomIn className="w-3.5 h-3.5" />}
              />
            </div>
          }
        >
          {/* Topo 线路叠加层 */}
          {hasMultiAnnotations ? (
            (topoAnnotations[activeAnnotationIndex]?.topoLine?.length ?? 0) >= 2 && (
              <TopoLineOverlay
                points={topoAnnotations[activeAnnotationIndex].topoLine}
                color={routeColor}
                tension={topoAnnotations[activeAnnotationIndex].topoTension}
                objectFit="contain"
                aspectRatio={imageAspectRatio}
              />
            )
          ) : hasTopoLine ? (
            useMultiLineMode ? (
              <MultiTopoLineOverlay
                ref={multiFullscreenOverlayRef}
                routes={validSiblingRoutes}
                selectedRouteId={route.id}
                onRouteSelect={handleRouteSelect}
                objectFit="contain"
                aspectRatio={imageAspectRatio}
              />
            ) : (
              <TopoLineOverlay
                ref={fullscreenOverlayRef}
                points={route.topoLine!}
                color={routeColor}
                tension={route.topoTension}
                animated
                objectFit="contain"
                aspectRatio={imageAspectRatio}
              />
            )
          ) : null}
        </ImageViewer>
      )}

      {/* Beta 列表抽屉 */}
      <BetaListDrawer
        isOpen={betaListOpen}
        onClose={() => setBetaListOpen(false)}
        betaLinks={betaLinks}
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
        onSuccess={() => fetchLatestBetas(true)}
      />
    </>
  )
}
