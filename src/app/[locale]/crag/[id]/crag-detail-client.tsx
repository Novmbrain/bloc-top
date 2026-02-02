'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { FileText, Car, ChevronLeft, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCragCoverUrl } from '@/lib/constants'
import AMapContainer from '@/components/amap-container'
import { WeatherCard } from '@/components/weather-card'
import type { Crag, Route } from '@/types'

// 岩场真实 GPS 坐标
const CRAG_COORDINATES: Record<string, { lng: number; lat: number }> = {
  'yuan-tong-si': { lng: 119.52508494257924, lat: 26.47524770432985 }, // 圆通寺岩场
  'ba-jing-cun': { lng: 119.55549, lat: 26.43837 },                    // 八井村岩场
  // 默认坐标 (罗源县中心)
  default: { lng: 119.5495, lat: 26.4893 },
}

interface CragDetailClientProps {
  crag: Crag
  routes: Route[]
}

export default function CragDetailClient({ crag, routes }: CragDetailClientProps) {
  const t = useTranslations('CragDetail')
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  // 生成封面图 URL
  const images = [1, 2].map((n) => getCragCoverUrl(crag.id, n))

  // 监听滚动位置更新当前索引
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const itemWidth = container.offsetWidth
      const newIndex = Math.round(scrollLeft / itemWidth)
      setCurrentIndex(newIndex)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // 计算难度范围
  const grades = routes
    .map((r) => r.grade)
    .filter((g) => g !== '？')
    .sort((a, b) => {
      const numA = parseInt(a.replace('V', ''))
      const numB = parseInt(b.replace('V', ''))
      return numA - numB
    })

  const gradeRange =
    grades.length > 0
      ? grades[0] === grades[grades.length - 1]
        ? grades[0]
        : `${grades[0]} - ${grades[grades.length - 1]}`
      : '暂无'

  return (
    <div
      className="flex flex-col h-dvh overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-surface)',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 封面图区域 */}
      <div className="relative flex-shrink-0">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* 图片滑动查看 - 使用原生滚动 + CSS Scroll Snap */}
        <div
          ref={scrollContainerRef}
          className="relative h-48 overflow-x-auto scrollbar-hide"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="flex h-full">
            {images.map((src, idx) => (
              <div
                key={idx}
                className="w-full flex-shrink-0 h-48 relative"
                style={{ scrollSnapAlign: 'start' }}
              >
                <Image
                  src={src}
                  alt={`${crag.name} ${idx + 1}`}
                  fill
                  priority={idx === 0}
                  sizes="100vw"
                  className="object-cover"
                  draggable={false}
                />
              </div>
            ))}
          </div>

          {/* 底部圆点指示器 */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 内容滚动区域 */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {/* 标题区域 */}
        <div className="py-4">
          <div className="flex flex-col mb-2">
            <h1
              className="text-3xl font-bold tracking-wide leading-tight"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              {crag.name}
            </h1>
            <div
              className="w-10 h-0.5 mt-1"
              style={{ background: 'linear-gradient(to right, var(--theme-primary), transparent)' }}
            />
          </div>

          {/* 徽章组 */}
          <div className="flex flex-wrap gap-1 mt-2">
            <span
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
                color: 'var(--theme-primary)',
                borderRadius: 'var(--theme-radius-full)',
              }}
            >
              {routes.length} 条线路
            </span>
            <span
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                color: 'var(--theme-on-surface-variant)',
                borderRadius: 'var(--theme-radius-full)',
              }}
            >
              {gradeRange}
            </span>
          </div>
        </div>

        {/* 前往方式卡片 */}
        {crag.approach && (
          <InfoCard
            icon={<Car className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />}
            iconBg="var(--theme-surface-variant)"
            title="前往方式"
            content={crag.approach}
            delay={0}
          />
        )}

        {/* 天气卡片 */}
        <WeatherCard
          coordinates={crag.coordinates || CRAG_COORDINATES[crag.id] || CRAG_COORDINATES.default}
          delay={25}
        />

        {/* 地图卡片 */}
        <div
          className="p-3 mb-2 animate-fade-in-up"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderRadius: 'var(--theme-radius-xl)',
            boxShadow: 'var(--theme-shadow-sm)',
            animationDelay: '50ms',
            transition: 'var(--theme-transition)',
          }}
        >
          <div className="flex items-center mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))' }}
            >
              <Map className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <span className="text-base font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
              岩场地图
            </span>
          </div>
          <AMapContainer
            center={crag.coordinates || CRAG_COORDINATES[crag.id] || CRAG_COORDINATES.default}
            name={crag.name}
            zoom={15}
            height="180px"
            approachPaths={crag.approachPaths}
          />
          <p
            className="text-xs mt-2 text-center"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            点击导航按钮可跳转高德地图
          </p>
        </div>

        {/* 岩场介绍卡片 */}
        <InfoCard
          icon={<FileText className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />}
          iconBg="var(--theme-surface-variant)"
          title="岩场介绍"
          content={crag.description}
          delay={100}
        />
      </main>

      {/* 底部操作按钮 */}
      <div
        className="fixed bottom-0 left-0 right-0 desktop-center-padded p-4"
        style={{ background: `linear-gradient(to top, var(--theme-surface), transparent)` }}
      >
        <Button
          onClick={() => router.push(`/route?crag=${crag.id}`)}
          className="w-full h-12 font-semibold"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-xl)',
            boxShadow: 'var(--theme-shadow-lg)',
          }}
        >
          {t('exploreRoutes')}
        </Button>
      </div>
    </div>
  )
}

interface InfoCardProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  content: string
  delay?: number
}

function InfoCard({ icon, iconBg, title, content, delay = 0 }: InfoCardProps) {
  return (
    <div
      className="p-3 mb-2 animate-fade-in-up"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderRadius: 'var(--theme-radius-xl)',
        boxShadow: 'var(--theme-shadow-sm)',
        animationDelay: `${delay}ms`,
        transition: 'var(--theme-transition)',
      }}
    >
      <div className="flex items-center mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <span className="text-base font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
          {title}
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-on-surface-variant)' }}>
        {content}
      </p>
    </div>
  )
}
