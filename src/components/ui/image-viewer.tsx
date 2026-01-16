'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageViewerProps {
  isOpen: boolean
  onClose: () => void
  src: string
  alt?: string
}

export function ImageViewer({ isOpen, onClose, src, alt = '' }: ImageViewerProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null)
  const lastTouchDistanceRef = useRef<number | null>(null)
  const lastTapRef = useRef<number>(0)
  const startYRef = useRef<number>(0)

  // 重置状态（打开时重置缩放和位置）
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 重置缩放状态是必要的 UX 行为
      setScale(1)
       
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  // 锁定 body 滚动
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 计算双指距离
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // 双击切换缩放
  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setScale(2.5)
    }
  }, [scale])

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
      startYRef.current = e.touches[0].clientY

      // 检测双击
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        handleDoubleTap()
      }
      lastTapRef.current = now
    } else if (e.touches.length === 2) {
      lastTouchDistanceRef.current = getTouchDistance(e.touches)
    }
    setIsDragging(true)
  }, [handleDoubleTap])

  // 触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return

    if (e.touches.length === 2) {
      // 双指缩放
      const distance = getTouchDistance(e.touches)
      if (lastTouchDistanceRef.current !== null) {
        const delta = distance / lastTouchDistanceRef.current
        setScale((prev) => Math.min(4, Math.max(1, prev * delta)))
      }
      lastTouchDistanceRef.current = distance
    } else if (e.touches.length === 1 && lastTouchRef.current) {
      const touch = e.touches[0]
      const deltaX = touch.clientX - lastTouchRef.current.x
      const deltaY = touch.clientY - lastTouchRef.current.y

      if (scale > 1) {
        // 缩放状态下可平移
        setPosition((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }))
      }

      lastTouchRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      }
    }
  }, [isDragging, scale])

  // 触摸结束
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setIsDragging(false)

    // 单指下滑关闭（仅在未缩放状态）
    if (e.changedTouches.length === 1 && scale === 1) {
      const deltaY = e.changedTouches[0].clientY - startYRef.current
      if (deltaY > 100) {
        onClose()
      }
    }

    lastTouchRef.current = null
    lastTouchDistanceRef.current = null
  }, [scale, onClose])

  // 单击关闭（仅在未缩放状态）
  const handleBackdropClick = useCallback(() => {
    if (scale === 1) {
      onClose()
    }
  }, [scale, onClose])

  // 缩放按钮
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(4, prev + 0.5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(1, prev - 0.5)
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 })
      }
      return newScale
    })
  }, [])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 关闭按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
        aria-label="关闭"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* 缩放控制 */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleZoomOut()
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
          disabled={scale <= 1}
          aria-label="缩小"
        >
          <ZoomOut className={`w-5 h-5 ${scale <= 1 ? 'text-white/40' : 'text-white'}`} />
        </button>
        <span className="text-white text-sm font-medium min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleZoomIn()
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
          disabled={scale >= 4}
          aria-label="放大"
        >
          <ZoomIn className={`w-5 h-5 ${scale >= 4 ? 'text-white/40' : 'text-white'}`} />
        </button>
      </div>

      {/* 图片 */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain select-none"
          sizes="100vw"
          priority
          draggable={false}
        />
      </div>
    </div>
  )
}
