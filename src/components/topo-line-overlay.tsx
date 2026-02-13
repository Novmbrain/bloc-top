'use client'

import { useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
import type { TopoPoint } from '@/types'
import { catmullRomCurve, scalePoints } from '@/lib/topo-utils'
import {
  TOPO_LINE_CONFIG,
  TOPO_MARKER_CONFIG,
  TOPO_ANIMATION_CONFIG,
  computeViewBox,
} from '@/lib/topo-constants'

export interface TopoLineOverlayProps {
  /** 归一化坐标点 (0-1 范围) */
  points: TopoPoint[]
  /** 线路颜色 */
  color: string
  /** 是否启用画线动画，默认 true */
  animated?: boolean
  /** 自动播放延迟 (ms)，0 或 undefined 表示不自动播放 */
  autoPlayDelay?: number
  /** 动画开始回调 */
  onAnimationStart?: () => void
  /** 动画完成回调 */
  onAnimationEnd?: () => void
  /**
   * 图片填充模式，用于匹配 CSS object-fit 行为
   * - 'cover': 对应 object-cover，SVG 使用 xMidYMid slice（裁剪填满）
   * - 'contain': 对应 object-contain，SVG 使用 xMidYMid meet（完整显示）
   * 默认为 'cover'
   */
  objectFit?: 'cover' | 'contain'
  /** Catmull-Rom 曲线张力 0-1 (0=平滑, 1=折线, 默认 0) */
  tension?: number
  /** 图片宽高比 (width/height)，用于动态 viewBox 计算。不传则使用默认 4:3 */
  aspectRatio?: number
}

export interface TopoLineOverlayRef {
  /** 重播画线动画 */
  replay: () => void
}

/**
 * Topo 线路 SVG 叠加层组件
 *
 * 用于在岩石图片上叠加显示攀岩线路，支持：
 * - 贝塞尔曲线平滑渲染
 * - stroke-dasharray 画线动画
 * - 点击起点触发重播
 * - 自动播放延迟
 *
 * @example
 * ```tsx
 * <TopoLineOverlay
 *   points={route.topoLine}
 *   color={getGradeColor(route.grade)}
 *   autoPlayDelay={300}
 * />
 * ```
 */
export const TopoLineOverlay = forwardRef<TopoLineOverlayRef, TopoLineOverlayProps>(
  function TopoLineOverlay(
    {
      points,
      color,
      animated = true,
      autoPlayDelay,
      onAnimationStart,
      onAnimationEnd,
      objectFit = 'cover',
      tension = 0,
      aspectRatio,
    },
    ref
  ) {
    const pathRef = useRef<SVGPathElement>(null)
    const hasAutoPlayed = useRef(false)

    // 动态 viewBox 尺寸（保持面积恒定，确保 strokeWidth 一致）
    const vb = useMemo(() => computeViewBox(aspectRatio ?? 4 / 3), [aspectRatio])

    // 缩放坐标到 viewBox 尺寸
    const scaledPoints = useMemo(
      () => scalePoints(points, vb.width, vb.height),
      [points, vb]
    )

    // 生成 Catmull-Rom 样条曲线路径
    const pathData = useMemo(() => catmullRomCurve(scaledPoints, 0.5, tension), [scaledPoints, tension])

    // 起点
    const startPoint = scaledPoints[0]

    // 画线动画函数
    const animate = useCallback(() => {
      const path = pathRef.current
      if (!path || !animated) return

      onAnimationStart?.()

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
        onAnimationEnd?.()
        path.removeEventListener('transitionend', handleTransitionEnd)
      }
      path.addEventListener('transitionend', handleTransitionEnd)
    }, [animated, onAnimationStart, onAnimationEnd])

    // 暴露 replay 方法给父组件
    useImperativeHandle(ref, () => ({
      replay: animate,
    }), [animate])

    // 自动播放
    useEffect(() => {
      if (autoPlayDelay && autoPlayDelay > 0 && !hasAutoPlayed.current) {
        const timer = setTimeout(() => {
          animate()
          hasAutoPlayed.current = true
        }, autoPlayDelay)
        return () => clearTimeout(timer)
      }
    }, [autoPlayDelay, animate])

    // 点不足 2 个时不渲染
    if (scaledPoints.length < 2) return null

    // SVG preserveAspectRatio 映射：
    // - cover (object-cover) → xMidYMid slice (裁剪填满，保持比例)
    // - contain (object-contain) → xMidYMid meet (完整显示，保持比例)
    const preserveAspectRatio = objectFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${vb.width} ${vb.height}`}
        preserveAspectRatio={preserveAspectRatio}
      >
        {/* 线路路径 - 外层白色描边 (增加可见性) */}
        <path
          d={pathData}
          stroke="white"
          strokeWidth={TOPO_LINE_CONFIG.outlineWidth}
          strokeLinecap={TOPO_LINE_CONFIG.strokeLinecap}
          strokeLinejoin={TOPO_LINE_CONFIG.strokeLinejoin}
          fill="none"
          opacity={TOPO_LINE_CONFIG.outlineOpacity}
        />

        {/* 线路路径 - 主色 (带画线动画) */}
        <path
          ref={pathRef}
          d={pathData}
          stroke={color}
          strokeWidth={TOPO_LINE_CONFIG.strokeWidth}
          strokeLinecap={TOPO_LINE_CONFIG.strokeLinecap}
          strokeLinejoin={TOPO_LINE_CONFIG.strokeLinejoin}
          fill="none"
        />

        {/* 起点 - 可点击触发重播动画 */}
        <circle
          cx={startPoint.x}
          cy={startPoint.y}
          r={TOPO_MARKER_CONFIG.startRadius}
          fill={color}
          stroke="white"
          strokeWidth={TOPO_MARKER_CONFIG.strokeWidth}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onClick={(e) => {
            e.stopPropagation()
            animate()
          }}
        />


      </svg>
    )
  }
)
