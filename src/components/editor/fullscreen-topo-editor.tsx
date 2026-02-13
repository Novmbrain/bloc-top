'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { X, Trash2, Undo2, Minus, Plus, RotateCcw, Check, Eye, EyeOff } from 'lucide-react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import type { TopoPoint } from '@/types'
import { catmullRomCurve, scalePoints } from '@/lib/topo-utils'
import { getGradeColor } from '@/lib/tokens'
import { VIEW_WIDTH, VIEW_HEIGHT } from '@/lib/editor-utils'

/** 其他线路的简化数据 */
interface OtherRoute {
  id: number
  grade: string
  topoLine: TopoPoint[]
  topoTension?: number
}

/**
 * 全屏 Topo 编辑覆盖层
 * 支持双指缩放 + 平移 + 点击添加标记点 + 曲线张力调节
 */
export function FullscreenTopoEditor({
  imageUrl,
  topoLine,
  routeColor,
  tension = 0,
  otherRoutes = [],
  onAddPoint,
  onRemoveLastPoint,
  onClearPoints,
  onTensionChange,
  onClose,
}: {
  imageUrl: string
  topoLine: TopoPoint[]
  routeColor: string
  tension?: number
  otherRoutes?: OtherRoute[]
  onAddPoint: (point: TopoPoint) => void
  onRemoveLastPoint: () => void
  onClearPoints: () => void
  onTensionChange?: (tension: number) => void
  onClose: (confirmed: boolean) => void
}) {
  const imgContainerRef = useRef<HTMLDivElement>(null)
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const [scale, setScale] = useState(1)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showOtherRoutes, setShowOtherRoutes] = useState(true)
  const initialTopoLineRef = useRef<TopoPoint[]>(topoLine)
  const initialTensionRef = useRef<number>(tension ?? 0)

  // 预计算其他线路的 SVG 路径数据
  const otherRoutePaths = useMemo(() => {
    if (!showOtherRoutes) return []
    return otherRoutes
      .filter(r => r.topoLine.length >= 2)
      .map(r => {
        const scaled = scalePoints(r.topoLine, VIEW_WIDTH, VIEW_HEIGHT)
        return {
          id: r.id,
          color: getGradeColor(r.grade),
          path: catmullRomCurve(scaled, 0.5, r.topoTension ?? 0),
          start: scaled[0],
        }
      })
  }, [otherRoutes, showOtherRoutes])

  const hasTopoChanges = useCallback((): boolean => {
    const orig = initialTopoLineRef.current
    if (topoLine.length !== orig.length) return true
    for (let i = 0; i < topoLine.length; i++) {
      if (topoLine[i].x !== orig[i].x || topoLine[i].y !== orig[i].y) return true
    }
    if ((tension ?? 0) !== initialTensionRef.current) return true
    return false
  }, [topoLine, tension])

  const handleRequestClose = useCallback(() => {
    if (hasTopoChanges()) setShowExitConfirm(true)
    else onClose(true)
  }, [hasTopoChanges, onClose])

  // Body 滚动锁定 + ESC 关闭
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showExitConfirm) { setShowExitConfirm(false); return }
        if (showClearConfirm) { setShowClearConfirm(false); return }
        handleRequestClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', handleKey)
    }
  }, [handleRequestClose, showExitConfirm, showClearConfirm])

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
    if (fsScaledPoints.length < 2) return ''
    return catmullRomCurve(fsScaledPoints, 0.5, tension)
  }, [fsScaledPoints, tension])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: '#000' }}
    >
      {/* 顶部工具栏 */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-4 py-3 pointer-events-none"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <button
          onClick={handleRequestClose}
          className="pointer-events-auto p-2.5 rounded-full transition-all active:scale-90"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}
        >
          <X className="w-5 h-5 text-white" />
        </button>
        {otherRoutes.length > 0 && (
          <button
            onClick={() => setShowOtherRoutes(prev => !prev)}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-90"
            style={{
              backgroundColor: showOtherRoutes ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.45)',
              WebkitBackdropFilter: 'blur(12px)',
              backdropFilter: 'blur(12px)',
              color: 'white',
            }}
          >
            {showOtherRoutes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {otherRoutes.length}条
          </button>
        )}
      </div>

      {/* 全屏缩放画布 */}
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
                {/* 其他线路（只读，底层） */}
                {otherRoutePaths.map(r => (
                  <g key={r.id} opacity={0.35}>
                    <path
                      d={r.path}
                      stroke="white"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={0.5}
                    />
                    <path
                      d={r.path}
                      stroke={r.color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <circle
                      cx={r.start.x}
                      cy={r.start.y}
                      r={5}
                      fill={r.color}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  </g>
                ))}
                {/* 当前编辑线路 */}
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

      {/* ══════ 底部浮动工具面板 (Palette) ══════ */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-3 pointer-events-none"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <div
          className="pointer-events-auto rounded-2xl overflow-hidden backdrop-blur-2xl animate-fade-in-up"
          style={{
            backgroundColor: 'rgba(22, 22, 26, 0.88)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 -2px 20px rgba(0,0,0,0.4)',
          }}
        >
          {/* 第一行: 操作按钮 + 状态 + 完成 */}
          <div className="flex items-center px-3 py-2.5">
            {/* 左侧: 撤销 + 清空 */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onRemoveLastPoint}
                disabled={topoLine.length === 0}
                className="p-2 rounded-xl transition-all active:scale-90"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  opacity: topoLine.length === 0 ? 0.3 : 1,
                }}
              >
                <Undo2 className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => { if (topoLine.length > 0) setShowClearConfirm(true) }}
                disabled={topoLine.length === 0}
                className="p-2 rounded-xl transition-all active:scale-90"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  opacity: topoLine.length === 0 ? 0.3 : 1,
                }}
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* 中间: 点数状态 */}
            <div className="flex-1 flex justify-center">
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: topoLine.length > 0
                    ? `color-mix(in srgb, ${routeColor} 15%, transparent)`
                    : 'rgba(255,255,255,0.06)',
                  color: topoLine.length > 0
                    ? routeColor
                    : 'rgba(255,255,255,0.4)',
                }}
              >
                {topoLine.length} 个点
              </span>
            </div>

            {/* 右侧: 完成 CTA */}
            <button
              onClick={() => onClose(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm transition-all active:scale-95"
              style={{
                backgroundColor: 'rgba(74,222,128,0.18)',
                color: '#4ade80',
              }}
            >
              <Check className="w-4 h-4" />
              完成
            </button>
          </div>

          {/* 第二行: 张力滑块 (≥2 个点时显示) */}
          {topoLine.length >= 2 && onTensionChange && (
            <div
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[11px] text-white/35 whitespace-nowrap">平滑</span>
              {/* eslint-disable-next-line no-restricted-syntax -- range input, no IME */}
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={tension ?? 0}
                onChange={(e) => onTensionChange(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${routeColor} ${(tension ?? 0) * 100}%, rgba(255,255,255,0.15) ${(tension ?? 0) * 100}%)`,
                  accentColor: routeColor,
                }}
              />
              <span className="text-[11px] text-white/35 whitespace-nowrap">折线</span>
            </div>
          )}

          {/* 第三行: 缩放控制 (视觉弱化) */}
          <div
            className="flex items-center justify-center gap-3 px-4 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={() => transformRef.current?.zoomOut()}
              className="p-1.5 rounded-lg transition-all active:scale-90"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
            >
              <Minus className="w-3.5 h-3.5 text-white/50" />
            </button>
            <span className="text-white/45 text-xs font-medium min-w-[44px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => transformRef.current?.zoomIn()}
              className="p-1.5 rounded-lg transition-all active:scale-90"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
            >
              <Plus className="w-3.5 h-3.5 text-white/50" />
            </button>
            <button
              onClick={() => transformRef.current?.resetTransform()}
              className="p-1.5 rounded-lg transition-all active:scale-90"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
            >
              <RotateCcw className="w-3.5 h-3.5 text-white/50" />
            </button>
          </div>
        </div>
      </div>

      {/* 退出确认对话框 */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="mx-4 w-full max-w-sm p-6 rounded-xl"
            style={{ backgroundColor: 'var(--theme-surface)', boxShadow: 'var(--theme-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-on-surface)' }}>
              标注已修改
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--theme-on-surface-variant)' }}>
              退出后未确认的标注改动将丢失。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowExitConfirm(false); onClose(false) }}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--theme-on-surface)',
                  border: '1.5px solid var(--theme-outline)',
                }}
              >
                丢弃
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); onClose(true) }}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                }}
              >
                保留改动
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 清空确认对话框 */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="mx-4 w-full max-w-sm p-6 rounded-xl"
            style={{ backgroundColor: 'var(--theme-surface)', boxShadow: 'var(--theme-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--theme-on-surface)' }}>
              确定清空所有标注点？
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--theme-on-surface)',
                  border: '1.5px solid var(--theme-outline)',
                }}
              >
                取消
              </button>
              <button
                onClick={() => { onClearPoints(); setShowClearConfirm(false) }}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--theme-error)',
                  color: 'white',
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FullscreenTopoEditor
