'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, Maximize2 } from 'lucide-react'
import type { Coordinates, ApproachPath } from '@/types'

// 高德地图 API Key (从环境变量读取)
const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || ''

interface AMapContainerProps {
  /** 地图中心点坐标 */
  center: Coordinates
  /** 岩场名称 (用于标记) */
  name: string
  /** 初始缩放级别 */
  zoom?: number
  /** 地图高度 */
  height?: string
  /** 接近路径 (可选，用于 KML 导入后绘制) */
  approachPaths?: ApproachPath[]
  /** 是否显示控制按钮 */
  showControls?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AMapType = any

export default function AMapContainer({
  center,
  name,
  zoom = 15,
  height = '200px',
  approachPaths = [],
  showControls = true,
}: AMapContainerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const initMap = async () => {
      try {
        // 动态导入 AMapLoader，避免 SSR 时访问 window
        const AMapLoader = (await import('@amap/amap-jsapi-loader')).default

        const AMap: AMapType = await AMapLoader.load({
          key: AMAP_KEY,
          version: '1.4.15',
          plugins: ['AMap.Scale', 'AMap.ToolBar'],
        })

        if (!isMounted || !containerRef.current) return

        // 创建地图实例 (使用 GCJ-02 坐标)
        const map = new AMap.Map(containerRef.current, {
          viewMode: '2D',
          zoom,
          center: [center.lng, center.lat],
          resizeEnable: true,
        })

        mapRef.current = map

        // 添加岩场标记
        const marker = new AMap.Marker({
          position: [center.lng, center.lat],
          title: name,
          label: {
            content: `<div style="
              padding: 4px 8px;
              background: var(--theme-primary, #1a1a1a);
              color: white;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            ">${name}</div>`,
            offset: [0, -40],
            direction: 'top',
          },
        })

        map.add(marker)

        // 绘制接近路径
        if (approachPaths.length > 0) {
          approachPaths.forEach((path) => {
            const polyline = new AMap.Polyline({
              path: path.points.map((p) => [p.lng, p.lat] as [number, number]),
              strokeColor: path.color || '#3366FF',
              strokeWeight: 4,
              strokeOpacity: 0.8,
              strokeStyle: 'solid',
              lineJoin: 'round',
              lineCap: 'round',
              showDir: true, // 显示方向箭头
            })
            map.add(polyline)
          })

          // 自适应视野以显示所有路径
          map.setFitView()
        }

        setIsLoading(false)
      } catch (e) {
        console.error('高德地图加载失败:', e)
        if (isMounted) {
          // 提供更详细的错误信息
          const errorMessage = e instanceof Error ? e.message : String(e)
          if (errorMessage.includes('bindbindbindbindbindkey') || errorMessage.includes('BINDbindkey')) {
            setError('请在高德控制台配置域名白名单')
          } else if (errorMessage.includes('BINDbindbindkey')) {
            setError('API Key 无效')
          } else {
            setError(`地图加载失败: ${errorMessage.slice(0, 50)}`)
          }
          setIsLoading(false)
        }
      }
    }

    initMap()

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
  }, [center, name, zoom, approachPaths])

  // 重置视图到中心点
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setCenter([center.lng, center.lat])
      mapRef.current.setZoom(zoom)
    }
  }

  // 打开高德地图 App 导航 (传 GCJ-02 坐标 + coordinate=gaode)
  const handleNavigate = () => {
    const url = `https://uri.amap.com/marker?position=${center.lng},${center.lat}&name=${encodeURIComponent(name)}&src=pwa-topo&coordinate=gaode&callnative=1`
    window.open(url, '_blank')
  }

  // 全屏查看 (打开高德网页版)
  const handleFullscreen = () => {
    const url = `https://www.amap.com/place/${center.lng},${center.lat}`
    window.open(url, '_blank')
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          height,
          backgroundColor: 'var(--theme-surface-variant)',
          borderRadius: 'var(--theme-radius-lg)',
          color: 'var(--theme-on-surface-variant)',
        }}
      >
        <div className="text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ borderRadius: 'var(--theme-radius-lg)', overflow: 'hidden' }}>
      {/* 地图容器 */}
      <div ref={containerRef} style={{ height, width: '100%' }} />

      {/* 加载状态 */}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'var(--theme-surface-variant)' }}
        >
          <div className="text-center">
            <div
              className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              地图加载中...
            </p>
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      {showControls && !isLoading && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            onClick={handleRecenter}
            className="w-8 h-8 flex items-center justify-center rounded-full shadow-md"
            style={{
              backgroundColor: 'var(--theme-surface)',
              color: 'var(--theme-on-surface)',
            }}
            title="重置视图"
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            onClick={handleNavigate}
            className="w-8 h-8 flex items-center justify-center rounded-full shadow-md"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
            }}
            title="导航前往"
          >
            <Navigation className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            className="w-8 h-8 flex items-center justify-center rounded-full shadow-md"
            style={{
              backgroundColor: 'var(--theme-surface)',
              color: 'var(--theme-on-surface)',
            }}
            title="全屏查看"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
