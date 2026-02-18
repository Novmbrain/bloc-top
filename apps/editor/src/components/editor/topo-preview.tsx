import React from 'react'
import {
  Loader2,
  AlertCircle,
  Edit3,
  Eye,
  EyeOff,
} from 'lucide-react'
import Link from 'next/link'
import type { MultiTopoRoute } from '@/components/multi-topo-line-overlay'

export interface TopoPreviewProps {
  imageUrl: string | null
  imageLoadError: boolean
  isImageLoading: boolean
  imageAspectRatio: number | undefined
  topoLine: Array<{ x: number; y: number }>
  routeColor: string
  scaledPoints: Array<{ x: number; y: number }>
  pathData: string
  vb: { width: number; height: number }
  sameFaceRoutes: MultiTopoRoute[]
  showOtherRoutes: boolean
  onToggleOtherRoutes: () => void
  onOpenFullscreen: () => void
  onRouteClick: (routeId: number) => void
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void
  onImageError: () => void
  MultiTopoLineOverlay: React.ComponentType<{
    routes: MultiTopoRoute[]
    selectedRouteId: number
    onRouteSelect: (id: number) => void
    aspectRatio: number | undefined
    preserveAspectRatio: string
  }>
}

export const TopoPreview = React.memo(function TopoPreview({
  imageUrl,
  imageLoadError,
  isImageLoading,
  imageAspectRatio,
  topoLine,
  routeColor,
  scaledPoints,
  pathData,
  vb,
  sameFaceRoutes,
  showOtherRoutes,
  onToggleOtherRoutes,
  onOpenFullscreen,
  onRouteClick,
  onImageLoad,
  onImageError,
  MultiTopoLineOverlay,
}: TopoPreviewProps) {
  return (
    <div className="glass-light overflow-hidden" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--theme-outline-variant)' }}>
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--theme-on-surface)' }}>Topo 标注</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
            {topoLine.length >= 2 ? `${topoLine.length} 个控制点` : '尚未标注'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sameFaceRoutes.length > 0 && (
            <button
              onClick={onToggleOtherRoutes}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
              style={{
                backgroundColor: showOtherRoutes
                  ? 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))'
                  : 'var(--theme-surface)',
                color: showOtherRoutes ? 'var(--theme-primary)' : 'var(--theme-on-surface-variant)',
              }}
              title={showOtherRoutes ? '隐藏其他线路' : '显示其他线路'}
            >
              {showOtherRoutes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {sameFaceRoutes.length}条
            </button>
          )}
          <div className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}>
            {topoLine.length} 个点
          </div>
        </div>
      </div>

      {!imageUrl || imageLoadError ? (
        <div className="m-4 rounded-xl flex flex-col items-center justify-center aspect-[4/3]" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <AlertCircle className="w-10 h-10 mb-3" style={{ color: 'var(--theme-warning)' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--theme-on-surface)' }}>暂无岩面照片</p>
          <Link href="/faces" className="text-sm font-medium mt-1" style={{ color: 'var(--theme-primary)' }}>
            去岩面管理页面上传照片 →
          </Link>
        </div>
      ) : (
        <div className="p-4">
          <div
            className="relative rounded-xl overflow-hidden aspect-[4/3]"
            style={{ boxShadow: 'var(--theme-shadow-md)', backgroundColor: 'var(--theme-surface-variant)' }}
          >
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: 'var(--theme-surface-variant)' }}>
                <div className="text-center">
                  <div className="w-8 h-8 animate-spin mx-auto mb-2"><Loader2 className="w-full h-full" style={{ color: 'var(--theme-primary)' }} /></div>
                  <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>加载云端图片...</p>
                </div>
              </div>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={imageUrl}
              src={imageUrl}
              alt="岩面照片"
              className="w-full h-full object-contain"
              style={{ opacity: isImageLoading ? 0 : 1 }}
              draggable={false}
              onLoad={onImageLoad}
              onError={onImageError}
            />

            {sameFaceRoutes.length > 0 && (
              <MultiTopoLineOverlay
                routes={sameFaceRoutes}
                selectedRouteId={-1}
                onRouteSelect={onRouteClick}
                aspectRatio={imageAspectRatio}
                preserveAspectRatio="xMidYMid meet"
              />
            )}

            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${vb.width} ${vb.height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {pathData && (
                <path d={pathData} stroke={routeColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              )}
              {scaledPoints.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x} cy={point.y}
                  r={index === 0 ? 6 : index === scaledPoints.length - 1 ? 5 : 4}
                  fill={index === 0 ? routeColor : 'white'}
                  stroke={index === 0 ? 'white' : routeColor}
                  strokeWidth={index === 0 ? 1.5 : 2}
                />
              ))}
              {scaledPoints.length > 0 && (
                <text x={scaledPoints[0].x - 12} y={scaledPoints[0].y + 18} fill={routeColor} fontSize="10" fontWeight="bold">起点</text>
              )}
              {scaledPoints.length > 1 && (
                <text x={scaledPoints[scaledPoints.length - 1].x - 12} y={scaledPoints[scaledPoints.length - 1].y - 12} fill={routeColor} fontSize="10" fontWeight="bold">终点</text>
              )}
            </svg>
          </div>

          <button
            className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 mt-4 transition-all duration-200 active:scale-[0.98]"
            style={topoLine.length === 0
              ? { backgroundColor: 'var(--theme-primary)', color: 'var(--theme-on-primary)', boxShadow: 'var(--theme-shadow-sm)' }
              : { backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)', border: '1.5px solid var(--theme-outline-variant)', boxShadow: 'var(--theme-shadow-sm)' }
            }
            onClick={onOpenFullscreen}
          >
            <Edit3 className="w-4 h-4" />
            {topoLine.length === 0 ? '开始标注' : '编辑标注'}
          </button>
        </div>
      )}
    </div>
  )
})
