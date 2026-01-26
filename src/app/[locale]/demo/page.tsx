'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Edit3 } from 'lucide-react'
import Link from 'next/link'
import type { TopoPoint } from '@/types'
import { bezierCurve, scalePoints } from '@/lib/topo-utils'

// 模拟线路数据 - 归一化坐标 (0-1 范围)
const DEMO_ROUTES = [
  {
    id: 1,
    name: '新手友好',
    grade: 'V0',
    color: '#22C55E', // 绿色
    line: [
      { x: 0.2, y: 0.85 },   // 起点 (底部左侧)
      { x: 0.25, y: 0.65 },
      { x: 0.3, y: 0.45 },
      { x: 0.35, y: 0.3 },   // 终点 (中间偏上)
    ],
  },
  {
    id: 2,
    name: '岩缝裂隙',
    grade: 'V2',
    color: '#3B82F6', // 蓝色
    line: [
      { x: 0.5, y: 0.9 },    // 起点 (底部中间)
      { x: 0.52, y: 0.7 },
      { x: 0.48, y: 0.5 },
      { x: 0.55, y: 0.35 },
      { x: 0.5, y: 0.2 },    // 终点 (顶部中间)
    ],
  },
  {
    id: 3,
    name: '侧面挑战',
    grade: 'V4',
    color: '#F97316', // 橙色
    line: [
      { x: 0.75, y: 0.88 },  // 起点 (底部右侧)
      { x: 0.78, y: 0.7 },
      { x: 0.72, y: 0.55 },
      { x: 0.8, y: 0.4 },
      { x: 0.7, y: 0.25 },   // 终点
    ],
  },
]

// viewBox 尺寸
const VIEW_WIDTH = 400
const VIEW_HEIGHT = 300

/**
 * Topo 线路组件
 */
function TopoLine({
  line,
  color,
  isActive,
  onStartClick,
}: {
  line: TopoPoint[]
  color: string
  isActive: boolean
  onStartClick: () => void
}) {
  const pathRef = useRef<SVGPathElement>(null)

  // 触发画线动画
  const animate = useCallback(() => {
    const path = pathRef.current
    if (!path) return

    const length = path.getTotalLength()

    // 重置：隐藏线条
    path.style.transition = 'none'
    path.style.strokeDasharray = `${length} ${length}`
    path.style.strokeDashoffset = `${length}`

    // 强制浏览器重排
    path.getBoundingClientRect()

    // 动画：显示线条
    path.style.transition = 'stroke-dashoffset 0.8s ease-out'
    path.style.strokeDashoffset = '0'
  }, [])

  // 当激活时触发动画
  useEffect(() => {
    if (isActive) {
      animate()
    }
  }, [isActive, animate])

  const scaled = scalePoints(line, VIEW_WIDTH, VIEW_HEIGHT)
  const pathData = bezierCurve(scaled)
  const start = scaled[0]
  const end = scaled[scaled.length - 1]

  return (
    <g style={{ opacity: isActive ? 1 : 0.3 }}>
      {/* 线路路径 */}
      <path
        ref={pathRef}
        d={pathData}
        stroke={color}
        strokeWidth={isActive ? 4 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* 起点标记 - 可点击 */}
      <circle
        cx={start.x}
        cy={start.y}
        r={isActive ? 10 : 8}
        fill={color}
        stroke="white"
        strokeWidth={2}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        onClick={(e) => {
          e.stopPropagation()
          onStartClick()
        }}
      />

      {/* 终点标记 */}
      <circle
        cx={end.x}
        cy={end.y}
        r={isActive ? 8 : 6}
        fill="white"
        stroke={color}
        strokeWidth={3}
      />

      {/* 起点标签 */}
      {isActive && (
        <text
          x={start.x - 15}
          y={start.y + 25}
          fill={color}
          fontSize="12"
          fontWeight="bold"
        >
          起点
        </text>
      )}

      {/* 终点标签 */}
      {isActive && (
        <text
          x={end.x - 15}
          y={end.y - 15}
          fill={color}
          fontSize="12"
          fontWeight="bold"
        >
          终点
        </text>
      )}
    </g>
  )
}

/**
 * Demo 页面
 */
export default function TopoLineDemo() {
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null)

  return (
    <div
      className="min-h-screen p-4"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      {/* 标题 */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            Topo 线路绘制 Demo
          </h1>
          <Link
            href="/zh/demo/editor"
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
            }}
          >
            <Edit3 className="w-4 h-4" />
            编辑器
          </Link>
        </div>
        <p
          className="text-sm"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          基于 Boolder 项目的 SVG + 贝塞尔曲线方案。点击起点（实心圆）触发画线动画。
        </p>
      </div>

      {/* 岩石图片 + Topo 叠加层 */}
      <div className="max-w-2xl mx-auto mb-6">
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            boxShadow: 'var(--theme-shadow-lg)',
          }}
        >
          {/* 模拟岩石照片 - 使用渐变背景 */}
          <div
            className="w-full aspect-[4/3]"
            style={{
              background: `
                linear-gradient(135deg,
                  #8B7355 0%,
                  #A0926C 25%,
                  #6B5B47 50%,
                  #7A6B55 75%,
                  #5D4E3C 100%
                )
              `,
              position: 'relative',
            }}
          >
            {/* 添加一些纹理效果模拟岩石 */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(ellipse at 30% 70%, rgba(0,0,0,0.2) 0%, transparent 50%),
                  radial-gradient(ellipse at 70% 40%, rgba(0,0,0,0.15) 0%, transparent 40%),
                  radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.1) 0%, transparent 30%)
                `,
              }}
            />
            {/* 模拟岩石裂缝 */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 400 300"
              preserveAspectRatio="none"
              style={{ opacity: 0.3 }}
            >
              <path
                d="M 200 0 Q 195 100 210 150 Q 190 200 200 300"
                stroke="#4A3F32"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M 0 150 Q 100 155 150 140 Q 200 160 300 145"
                stroke="#4A3F32"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>

            {/* 岩石标题 */}
            <div
              className="absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: 'white',
              }}
            >
              模拟岩石 · Demo
            </div>
          </div>

          {/* SVG Topo 叠加层 */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            preserveAspectRatio="none"
          >
            {DEMO_ROUTES.map((route) => (
              <TopoLine
                key={route.id}
                line={route.line}
                color={route.color}
                isActive={activeRouteId === route.id}
                onStartClick={() => setActiveRouteId(route.id)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* 线路列表 */}
      <div className="max-w-2xl mx-auto">
        <h2
          className="text-lg font-semibold mb-3"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          线路列表
        </h2>
        <div className="space-y-2">
          {DEMO_ROUTES.map((route) => (
            <button
              key={route.id}
              className="w-full p-4 rounded-xl flex items-center gap-4 transition-all"
              style={{
                backgroundColor:
                  activeRouteId === route.id
                    ? `color-mix(in srgb, ${route.color} 15%, var(--theme-surface))`
                    : 'var(--theme-surface-variant)',
                border:
                  activeRouteId === route.id
                    ? `2px solid ${route.color}`
                    : '2px solid transparent',
              }}
              onClick={() => setActiveRouteId(route.id)}
            >
              {/* 颜色指示 */}
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: route.color }}
              />
              {/* 线路名 */}
              <span
                className="flex-1 text-left font-medium"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                {route.name}
              </span>
              {/* 难度 */}
              <span
                className="px-2 py-1 rounded text-sm font-mono"
                style={{
                  backgroundColor: route.color,
                  color: 'white',
                }}
              >
                {route.grade}
              </span>
            </button>
          ))}
        </div>

        {/* 清除选择 */}
        {activeRouteId && (
          <button
            className="mt-4 w-full py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--theme-surface-variant)',
              color: 'var(--theme-on-surface-variant)',
            }}
            onClick={() => setActiveRouteId(null)}
          >
            清除选择
          </button>
        )}
      </div>

      {/* 技术说明 */}
      <div
        className="max-w-2xl mx-auto mt-8 p-4 rounded-xl"
        style={{
          backgroundColor: 'var(--theme-surface-variant)',
        }}
      >
        <h3
          className="font-semibold mb-2"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          技术实现
        </h3>
        <ul
          className="text-sm space-y-1"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          <li>• 坐标归一化 (0-1) 存储，支持响应式</li>
          <li>• SVG 叠加层 + pointer-events-none</li>
          <li>• 二次贝塞尔曲线 (Q 命令) 平滑连接</li>
          <li>• stroke-dasharray 动画实现「画线」效果</li>
        </ul>
      </div>
    </div>
  )
}
