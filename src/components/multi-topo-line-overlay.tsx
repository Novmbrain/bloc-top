'use client'

import { useRef, useCallback, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react'
import type { TopoPoint } from '@/types'
import { catmullRomCurve, scalePoints } from '@/lib/topo-utils'
import { getGradeColor } from '@/lib/tokens'
import {
  TOPO_LINE_CONFIG,
  TOPO_MARKER_CONFIG,
  TOPO_ANIMATION_CONFIG,
  TOPO_MULTI_LINE_CONFIG,
  computeViewBox,
} from '@/lib/topo-constants'

/**
 * 简化的线路数据（用于多线路叠加显示）
 */
export interface MultiTopoRoute {
  id: number
  name: string
  grade: string
  topoLine: TopoPoint[]
  topoTension?: number
}

export interface MultiTopoLineOverlayProps {
  /** 同一岩面的所有线路 */
  routes: MultiTopoRoute[]
  /** 当前选中的线路 ID */
  selectedRouteId: number
  /** 线路切换回调 */
  onRouteSelect: (routeId: number) => void
  /** 图片填充模式 */
  objectFit?: 'cover' | 'contain'
  /** 自定义 preserveAspectRatio，覆盖 objectFit 推导值 */
  preserveAspectRatio?: string
  /** 图片宽高比 (width/height)，用于动态 viewBox 计算。不传则使用默认 4:3 */
  aspectRatio?: number
}

export interface MultiTopoLineOverlayRef {
  /** 重播选中线路的动画 */
  replay: () => void
}

/**
 * 多线路 Topo SVG 叠加层组件
 *
 * 用于在岩面图片上叠加显示多条攀岩线路，支持：
 * - 选中线路高亮显示 + 画线动画
 * - 未选中线路灰色弱化显示
 * - 点击未选中线路起点切换选中
 * - 丝滑的切换过渡动画
 */
export const MultiTopoLineOverlay = forwardRef<MultiTopoLineOverlayRef, MultiTopoLineOverlayProps>(
  function MultiTopoLineOverlay(
    {
      routes,
      selectedRouteId,
      onRouteSelect,
      objectFit = 'cover',
      preserveAspectRatio: preserveAspectRatioProp,
      aspectRatio,
    },
    ref
  ) {
    const selectedPathRef = useRef<SVGPathElement>(null)
    const [isAnimating, setIsAnimating] = useState(false)
    // 防止同一线路动画重复播放
    const lastAnimatedRouteId = useRef<number | null>(null)

    // 找到当前选中的线路
    const selectedRoute = useMemo(
      () => routes.find(r => r.id === selectedRouteId),
      [routes, selectedRouteId]
    )

    // 未选中的线路
    const inactiveRoutes = useMemo(
      () => routes.filter(r => r.id !== selectedRouteId),
      [routes, selectedRouteId]
    )

    // 动态 viewBox 尺寸
    const vb = useMemo(() => computeViewBox(aspectRatio ?? 4 / 3), [aspectRatio])

    // 预计算所有线路的路径数据
    const routePathData = useMemo(() => {
      const map = new Map<number, { path: string; start: TopoPoint }>()

      routes.forEach(route => {
        if (route.topoLine.length < 2) return

        const scaledPoints = scalePoints(route.topoLine, vb.width, vb.height)
        map.set(route.id, {
          path: catmullRomCurve(scaledPoints, 0.5, route.topoTension ?? 0),
          start: scaledPoints[0],
        })
      })

      return map
    }, [routes, vb])

    // 画线动画函数
    const animate = useCallback(() => {
      const path = selectedPathRef.current
      if (!path) return

      setIsAnimating(true)

      const length = path.getTotalLength()

      // 重置：隐藏线条
      path.style.transition = 'none'
      path.style.strokeDasharray = `${length} ${length}`
      path.style.strokeDashoffset = `${length}`

      // 强制浏览器重排
      path.getBoundingClientRect()

      // 动画：显示线条
      path.style.transition = `stroke-dashoffset ${TOPO_ANIMATION_CONFIG.duration} ${TOPO_ANIMATION_CONFIG.easing}`
      path.style.strokeDashoffset = '0'

      // 动画完成回调
      const handleTransitionEnd = () => {
        setIsAnimating(false)
        path.removeEventListener('transitionend', handleTransitionEnd)
      }
      path.addEventListener('transitionend', handleTransitionEnd)
    }, [])

    // 暴露 replay 方法给父组件
    useImperativeHandle(ref, () => ({
      replay: () => {
        lastAnimatedRouteId.current = null
        animate()
      },
    }), [animate])

    // 选中线路变化时播放动画（防止同一线路重复触发）
    useEffect(() => {
      if (selectedRoute && lastAnimatedRouteId.current !== selectedRouteId) {
        lastAnimatedRouteId.current = selectedRouteId
        const timer = setTimeout(() => {
          animate()
        }, TOPO_MULTI_LINE_CONFIG.drawAnimationDelay)
        return () => clearTimeout(timer)
      }
    }, [selectedRouteId, animate, selectedRoute])

    // 处理线路切换
    const handleRouteClick = useCallback((routeId: number) => {
      if (routeId !== selectedRouteId && !isAnimating) {
        onRouteSelect(routeId)
      }
    }, [selectedRouteId, isAnimating, onRouteSelect])

    // 没有有效线路时不渲染
    if (routes.length === 0) return null

    const selectedData = selectedRoute ? routePathData.get(selectedRouteId) : null
    const selectedColor = selectedRoute ? getGradeColor(selectedRoute.grade) : ''

    // SVG preserveAspectRatio 映射
    const preserveAspectRatio = preserveAspectRatioProp ?? (objectFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice')

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${vb.width} ${vb.height}`}
        preserveAspectRatio={preserveAspectRatio}
      >
        {/* 未选中线路 (先渲染，在底层) */}
        {inactiveRoutes.map(route => {
          const data = routePathData.get(route.id)
          if (!data) return null

          return (
            <g
              key={route.id}
              opacity={TOPO_MULTI_LINE_CONFIG.inactiveOpacity}
              style={{
                transition: `opacity ${TOPO_MULTI_LINE_CONFIG.fadeOutDuration}ms ease-out`,
              }}
            >
              {/* 外层白色描边 */}
              <path
                d={data.path}
                stroke="white"
                strokeWidth={TOPO_MULTI_LINE_CONFIG.inactiveOutlineWidth}
                strokeLinecap={TOPO_LINE_CONFIG.strokeLinecap}
                strokeLinejoin={TOPO_LINE_CONFIG.strokeLinejoin}
                fill="none"
                opacity={TOPO_LINE_CONFIG.outlineOpacity}
              />
              {/* 主线条 - 使用线路自身颜色 */}
              <path
                d={data.path}
                stroke={getGradeColor(route.grade)}
                strokeWidth={TOPO_MULTI_LINE_CONFIG.inactiveStrokeWidth}
                strokeLinecap={TOPO_LINE_CONFIG.strokeLinecap}
                strokeLinejoin={TOPO_LINE_CONFIG.strokeLinejoin}
                fill="none"
              />
              {/* 透明加宽 hit area - 便于点击线路主体切换 */}
              <path
                d={data.path}
                stroke="transparent"
                strokeWidth={16}
                strokeLinecap={TOPO_LINE_CONFIG.strokeLinecap}
                strokeLinejoin={TOPO_LINE_CONFIG.strokeLinejoin}
                fill="none"
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRouteClick(route.id)
                }}
              />
              {/* 起点标记 - 可点击切换 */}
              <circle
                cx={data.start.x}
                cy={data.start.y}
                r={TOPO_MULTI_LINE_CONFIG.inactiveMarkerRadius}
                fill={getGradeColor(route.grade)}
                stroke="white"
                strokeWidth={1.5}
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRouteClick(route.id)
                }}
              />
            </g>
          )
        })}

        {/* 选中线路 (后渲染，在顶层) */}
        {selectedData && (
          <g
            style={{
              transition: `opacity ${TOPO_MULTI_LINE_CONFIG.fadeInDuration}ms ease-in`,
            }}
          >
            {/* 外层白色描边 */}
            <path
              d={selectedData.path}
              stroke="white"
              strokeWidth={TOPO_LINE_CONFIG.outlineWidth}
              strokeLinecap={TOPO_LINE_CONFIG.strokeLinecap}
              strokeLinejoin={TOPO_LINE_CONFIG.strokeLinejoin}
              fill="none"
              opacity={TOPO_LINE_CONFIG.outlineOpacity}
            />

            {/* 主线条 (带画线动画) */}
            <path
              ref={selectedPathRef}
              d={selectedData.path}
              stroke={selectedColor}
              strokeWidth={TOPO_LINE_CONFIG.strokeWidth}
              strokeLinecap={TOPO_LINE_CONFIG.strokeLinecap}
              strokeLinejoin={TOPO_LINE_CONFIG.strokeLinejoin}
              fill="none"
            />

            {/* 起点 - 可点击触发重播动画 */}
            <circle
              cx={selectedData.start.x}
              cy={selectedData.start.y}
              r={TOPO_MARKER_CONFIG.startRadius}
              fill={selectedColor}
              stroke="white"
              strokeWidth={TOPO_MARKER_CONFIG.strokeWidth}
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              onClick={(e) => {
                e.stopPropagation()
                animate()
              }}
            />


          </g>
        )}
      </svg>
    )
  }
)
