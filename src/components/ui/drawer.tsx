'use client'

import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'

export type DrawerHeight = 'quarter' | 'half' | 'three-quarter' | 'full'

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
  quarter: '25vh',
  half: '50vh',
  'three-quarter': '75vh',
  full: '100vh',
}

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
  const startYRef = useRef<number>(0)
  const currentYRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)

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

  // 触摸手势处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    currentYRef.current = 0
    isDraggingRef.current = true
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || !drawerRef.current) return

    const deltaY = e.touches[0].clientY - startYRef.current
    // 只允许向下拖动
    if (deltaY > 0) {
      currentYRef.current = deltaY
      drawerRef.current.style.transform = `translateY(${deltaY}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current || !drawerRef.current) return

    isDraggingRef.current = false
    // 如果下滑超过 100px，关闭抽屉
    if (currentYRef.current > 100) {
      onClose()
    } else {
      // 回弹
      drawerRef.current.style.transform = 'translateY(0)'
    }
    currentYRef.current = 0
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60]">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        style={{ backdropFilter: 'blur(2px)' }}
      />

      {/* 抽屉主体 */}
      <div
        ref={drawerRef}
        className="absolute bottom-0 left-0 right-0 animate-drawer-in overflow-hidden flex flex-col"
        style={{
          height: HEIGHT_MAP[height],
          maxHeight: 'calc(100vh - env(safe-area-inset-top) - 20px)',
          backgroundColor: 'var(--theme-surface)',
          borderTopLeftRadius: 'var(--theme-radius-xl)',
          borderTopRightRadius: 'var(--theme-radius-xl)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          transition: 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 拖拽手柄 */}
        {showHandle && (
          <div className="flex justify-center py-3 flex-shrink-0">
            <div
              className="w-10 h-1 rounded-full"
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
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--theme-surface-variant)' }}
                aria-label="关闭"
              >
                <X className="w-4 h-4" style={{ color: 'var(--theme-on-surface)' }} />
              </button>
            )}
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
