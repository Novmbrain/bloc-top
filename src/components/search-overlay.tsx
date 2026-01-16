'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ChevronRight } from 'lucide-react'
import type { Route } from '@/types'
import { getGradeColor } from '@/lib/tokens'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
  results: Route[]
  allRoutes: Route[]
}

export function SearchOverlay({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  results,
  allRoutes,
}: SearchOverlayProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
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

  // 显示的线路：有搜索词时显示结果，否则显示全部
  const displayRoutes = searchQuery.trim() ? results : allRoutes
  const title = searchQuery.trim() ? `搜索结果 (${results.length})` : '全部线路'

  const handleRouteClick = (route: Route) => {
    onClose()
    router.push(`/route/${route.id}`)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        backgroundColor: 'var(--theme-surface)',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 搜索头部 */}
      <div
        className="sticky top-0 pt-12 px-4 pb-3"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderBottom: '1px solid var(--theme-outline-variant)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索线路名称"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-10 text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                color: 'var(--theme-on-surface)',
                borderRadius: 'var(--theme-radius-full)',
                transition: 'var(--theme-transition)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4" style={{ color: 'var(--theme-on-surface-variant)' }} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-sm font-medium"
            style={{ color: 'var(--theme-primary)' }}
          >
            取消
          </button>
        </div>
      </div>

      {/* 结果列表 */}
      <div className="overflow-y-auto h-[calc(100vh-120px)] px-4 py-2">
        <p className="text-xs mb-2" style={{ color: 'var(--theme-on-surface-variant)' }}>{title}</p>

        <div className="space-y-2">
          {displayRoutes.map((route, index) => (
            <button
              key={route.id}
              onClick={() => handleRouteClick(route)}
              className="w-full flex items-center p-3 transition-all active:scale-[0.98] animate-fade-in-up text-left"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderRadius: 'var(--theme-radius-xl)',
                boxShadow: 'var(--theme-shadow-sm)',
                animationDelay: `${index * 20}ms`,
              }}
            >
              {/* 难度标签 */}
              <div
                className="w-10 h-10 flex items-center justify-center mr-3 flex-shrink-0"
                style={{
                  backgroundColor: getGradeColor(route.grade) + '20',
                  borderRadius: 'var(--theme-radius-lg)',
                }}
              >
                <span
                  className="text-xs font-bold"
                  style={{ color: getGradeColor(route.grade) }}
                >
                  {route.grade}
                </span>
              </div>

              {/* 线路信息 */}
              <div className="flex-1 min-w-0">
                <span
                  className="text-sm font-semibold block truncate"
                  style={{ color: 'var(--theme-on-surface)' }}
                >
                  {route.name}
                </span>
                <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {route.area}
                </span>
              </div>

              {/* 箭头 */}
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--theme-on-surface-variant)' }} />
            </button>
          ))}
        </div>

        {displayRoutes.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: 'var(--theme-on-surface-variant)' }}>
              没有找到匹配的线路
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
