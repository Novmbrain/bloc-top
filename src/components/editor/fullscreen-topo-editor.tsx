'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { X, Trash2, Undo2, Minus, Plus, RotateCcw } from 'lucide-react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import type { TopoPoint } from '@/types'
import { bezierCurve, scalePoints } from '@/lib/topo-utils'
import { VIEW_WIDTH, VIEW_HEIGHT } from '@/lib/editor-utils'

/**
 * 全屏 Topo 编辑覆盖层
 * 支持双指缩放 + 平移 + 点击添加标记点
 */
export function FullscreenTopoEditor({
  imageUrl,
  topoLine,
  routeColor,
  onAddPoint,
  onRemoveLastPoint,
  onClearPoints,
  onClose,
}: {
  imageUrl: string
  topoLine: TopoPoint[]
  routeColor: string
  onAddPoint: (point: TopoPoint) => void
  onRemoveLastPoint: () => void
  onClearPoints: () => void
  onClose: () => void
}) {
  const imgContainerRef = useRef<HTMLDivElement>(null)
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const [scale, setScale] = useState(1)

  // Body 滚动锁定 + ESC 关闭
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const down = pointerDownRef.current
    if (!down || !imgContainerRef.current) return
    const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y)
    const elapsed = Date.now() - down.time
    if (dist < 10 && elapsed < 300) {
      const rect = imgContainerRef.current.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width
      const relY = (e.clientY - rect.top) / rect.height
      if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
        onAddPoint({
          x: Math.max(0, Math.min(1, relX)),
          y: Math.max(0, Math.min(1, relY)),
        })
      }
    }
    pointerDownRef.current = null
  }, [onAddPoint])

  // SVG 数据
  const fsScaledPoints = useMemo(
    () => scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT),
    [topoLine]
  )
  const fsPathData = useMemo(() => {
    if (topoLine.length < 2) return ''
    const scaled = scalePoints(topoLine, VIEW_WIDTH, VIEW_HEIGHT)
    return bezierCurve(scaled)
  }, [topoLine])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#000' }}
    >
      {/* 顶部栏 */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          backgroundColor: 'rgba(0,0,0,0.8)',
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
        }}
      >
        <button
          onClick={onClose}
          className="p-2 rounded-full transition-all active:scale-90"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="flex items-center gap-2 text-white text-sm">
          <span className="px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            {topoLine.length} 个点
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRemoveLastPoint}
            disabled={topoLine.length === 0}
            className="p-2 rounded-full transition-all active:scale-90"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              opacity: topoLine.length === 0 ? 0.4 : 1,
            }}
          >
            <Undo2 className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onClearPoints}
            disabled={topoLine.length === 0}
            className="p-2 rounded-full transition-all active:scale-90"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              opacity: topoLine.length === 0 ? 0.4 : 1,
            }}
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* 缩放画布 */}
      <div
        className="flex-1 relative overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          centerOnInit
          onTransformed={(_, state) => setScale(state.scale)}
          panning={{ velocityDisabled: true }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div ref={imgContainerRef} className="relative" style={{ maxWidth: '100%', maxHeight: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Topo 全屏编辑"
                className="max-w-full max-h-[80vh] object-contain"
                draggable={false}
              />
              {/* SVG 叠加层 */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                preserveAspectRatio="none"
              >
                {fsPathData && (
                  <path
                    d={fsPathData}
                    stroke={routeColor}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
                {fsScaledPoints.map((point, index) => (
                  <g key={index}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={index === 0 ? 6 : index === fsScaledPoints.length - 1 ? 5 : 4}
                      fill={index === 0 ? routeColor : 'white'}
                      stroke={index === 0 ? 'white' : routeColor}
                      strokeWidth={index === 0 ? 1.5 : 2}
                    />
                    <text
                      x={point.x}
                      y={point.y + 2.5}
                      textAnchor="middle"
                      fontSize="7"
                      fontWeight="bold"
                      fill={index === 0 ? 'white' : routeColor}
                    >
                      {index + 1}
                    </text>
                  </g>
                ))}
                {fsScaledPoints.length > 0 && (
                  <text
                    x={fsScaledPoints[0].x - 12}
                    y={fsScaledPoints[0].y + 18}
                    fill={routeColor}
                    fontSize="10"
                    fontWeight="bold"
                  >
                    起点
                  </text>
                )}
                {fsScaledPoints.length > 1 && (
                  <text
                    x={fsScaledPoints[fsScaledPoints.length - 1].x - 12}
                    y={fsScaledPoints[fsScaledPoints.length - 1].y - 12}
                    fill={routeColor}
                    fontSize="10"
                    fontWeight="bold"
                  >
                    终点
                  </text>
                )}
              </svg>
            </div>
          </TransformComponent>
        </TransformWrapper>

        {/* 点击提示 */}
        {topoLine.length === 0 && (
          <div className="absolute inset-x-0 top-4 flex justify-center pointer-events-none">
            <div
              className="px-4 py-2 rounded-full text-sm text-white animate-fade-in"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              点击图片添加标记点
            </div>
          </div>
        )}
      </div>

      {/* 底部缩放控制栏 */}
      <div
        className="flex items-center justify-center gap-4 px-4 py-3 flex-shrink-0"
        style={{
          backgroundColor: 'rgba(0,0,0,0.8)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        }}
      >
        <button
          onClick={() => transformRef.current?.zoomOut()}
          className="p-2 rounded-full transition-all active:scale-90"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <Minus className="w-5 h-5 text-white" />
        </button>
        <span className="text-white text-sm font-medium min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => transformRef.current?.zoomIn()}
          className="p-2 rounded-full transition-all active:scale-90"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => transformRef.current?.resetTransform()}
          className="p-2 rounded-full transition-all active:scale-90"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <RotateCcw className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  )
}

export default FullscreenTopoEditor
