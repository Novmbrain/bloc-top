'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MapPin, FileText, Car, ChevronLeft, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Crag, Route } from '@/types'

const COS_BASE_URL = 'https://topo-image-1305178596.cos.ap-guangzhou.myqcloud.com'

interface CragDetailClientProps {
  crag: Crag
  routes: Route[]
}

export default function CragDetailClient({ crag, routes }: CragDetailClientProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)

  // 生成封面图 URL
  const images = [1, 2].map((n) => `${COS_BASE_URL}/CragSurface/${crag.id}/${n}.jpg`)

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
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--m3-surface)]">
      {/* 封面图区域 */}
      <div className="relative flex-shrink-0">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* 图片轮播 */}
        <div className="relative h-48 overflow-hidden">
          <div
            className="flex transition-transform duration-300"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {images.map((src, idx) => (
              <div key={idx} className="w-full flex-shrink-0 h-48 relative">
                <Image
                  src={src}
                  alt={`${crag.name} ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* 指示器 */}
          {images.length > 1 && (
            <div className="absolute right-4 bottom-4 bg-black/50 px-2 py-1 rounded-full">
              <span className="text-white text-xs">
                {currentIndex + 1}/{images.length}
              </span>
            </div>
          )}

          {/* 切换按钮 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Beta 视频按钮 */}
          <button className="absolute left-1/2 bottom-12 -translate-x-1/2 flex items-center gap-2 bg-black/65 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            <Play className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">岩场介绍视频</span>
          </button>
        </div>
      </div>

      {/* 内容滚动区域 */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {/* 标题区域 */}
        <div className="py-4">
          <div className="flex flex-col mb-2">
            <h1 className="text-3xl font-bold text-[var(--m3-on-surface)] tracking-wide leading-tight">
              {crag.name}
            </h1>
            <div className="w-10 h-0.5 mt-1 bg-gradient-to-r from-[var(--m3-primary)] to-transparent" />
          </div>

          {/* 徽章组 */}
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              {routes.length} 条线路
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--m3-surface-variant)] text-[var(--m3-on-surface-variant)]">
              {gradeRange}
            </span>
          </div>
        </div>

        {/* 位置卡片 */}
        <InfoCard
          icon={<MapPin className="w-5 h-5 text-[var(--m3-primary)]" />}
          iconBg="var(--m3-primary-container)"
          title="位置"
          content={crag.location}
          delay={0}
        />

        {/* 岩场介绍卡片 */}
        <InfoCard
          icon={<FileText className="w-5 h-5 text-[var(--m3-secondary)]" />}
          iconBg="var(--m3-secondary-container)"
          title="岩场介绍"
          content={crag.description}
          delay={50}
        />

        {/* 前往方式卡片 */}
        {crag.approach && (
          <InfoCard
            icon={<Car className="w-5 h-5 text-[var(--m3-on-surface-variant)]" />}
            iconBg="var(--m3-surface-variant)"
            title="前往方式"
            content={crag.approach}
            delay={100}
          />
        )}
      </main>

      {/* 底部操作按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--m3-surface)] to-transparent">
        <Button
          onClick={() => router.push(`/route?crag=${crag.id}`)}
          className="w-full h-12 bg-[var(--m3-primary)] hover:bg-[var(--m3-primary)]/90 text-white font-semibold rounded-xl shadow-lg"
        >
          开始探索线路
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
      className="p-3 bg-[var(--m3-surface)] rounded-xl mb-2 shadow-sm animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <span className="text-base font-semibold text-[var(--m3-on-surface)]">
          {title}
        </span>
      </div>
      <p className="text-sm text-[var(--m3-on-surface-variant)] leading-relaxed">
        {content}
      </p>
    </div>
  )
}
