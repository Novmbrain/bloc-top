'use client'

import { useEffect, useRef, useCallback, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

export type DrawerHeight = 'auto' | 'quarter' | 'half' | 'three-quarter' | 'full'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  height?: DrawerHeight
  showHandle?: boolean
  showCloseButton?: boolean
  title?: string
  children: ReactNode
}

const HEIGHT_MAP: Record<DrawerHeight, string> = {
  auto: 'auto',
  quarter: '25vh',
  half: '50vh',
  'three-quarter': '75vh',
  full: '100vh',
}

// iOS 风格弹簧动画曲线
const SPRING_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

// 交互阈值
const VELOCITY_THRESHOLD = 0.5 // px/ms (500px/s)
const DISTANCE_RATIO_THRESHOLD = 0.25 // 抽屉高度的 25%

export function Drawer({
  isOpen,
  onClose,
  height = 'half',
  showHandle = true,
  showCloseButton = false,
  title,
  children,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const currentYRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)
  const drawerHeightRef = useRef<number>(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 控制关闭动画状态
  const [isClosing, setIsClosing] = useState(false)

  // 获取抽屉高度用于计算关闭阈值，并重置关闭状态
  useEffect(() => {
    if (isOpen) {
      // 使用 requestAnimationFrame 延迟状态重置，避免在 effect 中同步 setState
      const frame = requestAnimationFrame(() => {
        setIsClosing(false)
        if (drawerRef.current) {
          drawerHeightRef.current = drawerRef.current.offsetHeight
        }
      })
      return () => cancelAnimationFrame(frame)
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

  // 带动画的关闭函数
  const handleClose = useCallback(() => {
    if (!drawerRef.current) {
      onClose()
      return
    }

    setIsClosing(true)

    // 动画结束后调用 onClose
    const animationDuration = 280
    setTimeout(() => {
      onClose()
    }, animationDuration)
  }, [onClose])

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // 更新遮罩透明度（拖拽视觉反馈）
  const updateOverlayOpacity = useCallback((dragDistance: number) => {
    if (!overlayRef.current || !drawerHeightRef.current) return

    // 根据拖拽距离计算遮罩透明度 (0.4 -> 0)
    const progress = Math.min(dragDistance / drawerHeightRef.current, 1)
    const opacity = 0.4 * (1 - progress)
    overlayRef.current.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`
  }, [])

  // 触摸手势处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // 仅在内容滚动到顶部时允许下滑关闭手势
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer && scrollContainer.scrollTop > 0) {
      isDraggingRef.current = false
      return
    }

    startYRef.current = e.touches[0].clientY
    startTimeRef.current = Date.now()
    currentYRef.current = 0
    isDraggingRef.current = true

    // 拖拽时禁用过渡动画，实现即时响应
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'none'
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || !drawerRef.current) return

    const deltaY = e.touches[0].clientY - startYRef.current
    // 只允许向下拖动
    if (deltaY > 0) {
      currentYRef.current = deltaY
      drawerRef.current.style.transform = `translateY(${deltaY}px)`
      // 更新遮罩透明度
      updateOverlayOpacity(deltaY)
    }
  }, [updateOverlayOpacity])

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current || !drawerRef.current) return

    isDraggingRef.current = false

    // 计算滑动速度
    const deltaTime = Date.now() - startTimeRef.current
    const velocity = currentYRef.current / deltaTime // px/ms

    // 计算距离阈值（抽屉高度的 25%）
    const distanceThreshold = drawerHeightRef.current * DISTANCE_RATIO_THRESHOLD

    // 恢复过渡动画
    drawerRef.current.style.transition = `transform 0.28s ${SPRING_EASING}`

    // 基于速度和距离判断是否关闭
    const shouldClose = velocity > VELOCITY_THRESHOLD || currentYRef.current > distanceThreshold

    if (shouldClose) {
      // 关闭抽屉
      handleClose()
    } else {
      // 回弹到原位
      drawerRef.current.style.transform = 'translateY(0)'
      // 恢复遮罩透明度
      if (overlayRef.current) {
        overlayRef.current.style.transition = `background-color 0.28s ${SPRING_EASING}`
        overlayRef.current.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'
      }
    }

    currentYRef.current = 0
  }, [handleClose])

  // 遮罩点击关闭
  const handleOverlayClick = useCallback(() => {
    handleClose()
  }, [handleClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60]">
      {/* 背景遮罩 */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 ${isClosing ? '' : 'animate-fade-in'}`}
        onClick={handleOverlayClick}
        style={{
          backgroundColor: isClosing ? 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, 0.4)',
          WebkitBackdropFilter: 'blur(var(--glass-blur-xs))',
          backdropFilter: 'blur(var(--glass-blur-xs))',
          transition: isClosing ? `background-color 0.28s ${SPRING_EASING}` : undefined,
        }}
      />

      {/* 抽屉主体 */}
      <div
        ref={drawerRef}
        className={`absolute bottom-0 left-0 right-0 desktop-center-full overflow-hidden flex flex-col glass-heavy ${
          isClosing ? '' : 'animate-drawer-in'
        }`}
        style={{
          height: HEIGHT_MAP[height],
          maxHeight: 'calc(100vh - env(safe-area-inset-top) - 20px)',
          borderTopLeftRadius: 'var(--theme-radius-xl)',
          borderTopRightRadius: 'var(--theme-radius-xl)',
          transform: isClosing ? 'translateY(100%)' : undefined,
          transition: isClosing ? `transform 0.28s ${SPRING_EASING}` : `transform 0.28s ${SPRING_EASING}`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 拖拽手柄 */}
        {showHandle && (
          <div className="flex justify-center py-3 flex-shrink-0 cursor-grab active:cursor-grabbing">
            <div
              className="w-10 h-1 rounded-full transition-all duration-150"
              style={{ backgroundColor: 'var(--theme-outline)' }}
            />
          </div>
        )}

        {/* 标题栏 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
            {title && (
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors glass-light"
                aria-label="关闭"
              >
                <X className="w-4 h-4" style={{ color: 'var(--theme-on-surface)' }} />
              </button>
            )}
          </div>
        )}

        {/* 内容区 */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>

        {/* iOS 安全区域 */}
        <div
          className="flex-shrink-0"
          style={{ height: 'env(safe-area-inset-bottom)' }}
        />
      </div>
    </div>
  )
}
