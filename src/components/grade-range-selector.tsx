'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { V_GRADES } from '@/lib/filter-constants'
import { getGradeColor } from '@/lib/tokens'

interface GradeRangeSelectorProps {
  selectedGrades: string[]
  onChange: (grades: string[]) => void
  className?: string
}

/**
 * 难度色谱条组件
 * 支持点击单选和拖动范围选择
 */
export function GradeRangeSelector({
  selectedGrades,
  onChange,
  className,
}: GradeRangeSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)

  // 本地乐观状态：在 URL 更新期间保持显示新选择
  const [optimisticSelection, setOptimisticSelection] = useState<string[] | null>(null)

  // 当 selectedGrades prop 更新时，清除乐观状态
  useEffect(() => {
    setOptimisticSelection(null)
  }, [selectedGrades])

  // 实际显示的选中状态（优先使用乐观状态）
  const displayedSelection = optimisticSelection ?? selectedGrades

  // 计算触摸/点击位置对应的等级索引
  const getGradeIndexFromPosition = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const index = Math.floor((x / rect.width) * V_GRADES.length)
    return Math.max(0, Math.min(V_GRADES.length - 1, index))
  }, [])

  // 根据拖动范围生成选中的等级数组
  const getSelectedFromRange = useCallback((start: number, end: number): string[] => {
    const min = Math.min(start, end)
    const max = Math.max(start, end)
    return V_GRADES.slice(min, max + 1) as string[]
  }, [])

  // 处理拖动开始
  const handleDragStart = useCallback((clientX: number) => {
    const index = getGradeIndexFromPosition(clientX)
    setIsDragging(true)
    setDragStart(index)
    setDragEnd(index)
  }, [getGradeIndexFromPosition])

  // 处理拖动移动
  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return
    const index = getGradeIndexFromPosition(clientX)
    setDragEnd(index)
  }, [isDragging, getGradeIndexFromPosition])

  // 处理拖动结束
  const handleDragEnd = useCallback(() => {
    if (!isDragging || dragStart === null || dragEnd === null) {
      setIsDragging(false)
      return
    }

    const newSelection = getSelectedFromRange(dragStart, dragEnd)

    // 设置乐观状态，立即显示新选择
    setOptimisticSelection(newSelection)

    // 清除拖动状态
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)

    // 通知父组件更新 URL
    onChange(newSelection)
  }, [isDragging, dragStart, dragEnd, getSelectedFromRange, onChange])

  // 鼠标事件处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX)
  }, [handleDragStart])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX)
  }, [handleDragMove])

  const handleMouseUp = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // 触摸事件处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleDragStart(touch.clientX)
  }, [handleDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleDragMove(touch.clientX)
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // 全局鼠标事件监听（拖动时可能移出组件区域）
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // 判断某个等级是否被选中（包括拖动预览）
  const isGradeSelected = useCallback((index: number): boolean => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const min = Math.min(dragStart, dragEnd)
      const max = Math.max(dragStart, dragEnd)
      return index >= min && index <= max
    }
    return displayedSelection.includes(V_GRADES[index])
  }, [isDragging, dragStart, dragEnd, displayedSelection])

  // 清除选择
  const handleClear = useCallback(() => {
    setOptimisticSelection([])
    onChange([])
  }, [onChange])

  // 计算显示的范围文本
  const getRangeText = (): string => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const min = Math.min(dragStart, dragEnd)
      const max = Math.max(dragStart, dragEnd)
      if (min === max) return V_GRADES[min]
      return `${V_GRADES[min]} - ${V_GRADES[max]}`
    }
    if (displayedSelection.length === 0) return '全部难度'
    if (displayedSelection.length === 1) return displayedSelection[0]

    // 找出选中范围的最小和最大
    const indices = displayedSelection.map(g => V_GRADES.indexOf(g as typeof V_GRADES[number])).filter(i => i >= 0)
    if (indices.length === 0) return '全部难度'
    const min = Math.min(...indices)
    const max = Math.max(...indices)
    return `${V_GRADES[min]} - ${V_GRADES[max]}`
  }

  return (
    <div className={className}>
      {/* 范围显示和清除按钮 */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          {getRangeText()}
        </span>
        {displayedSelection.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1 text-xs transition-colors active:scale-95"
            style={{
              color: 'var(--theme-primary)',
              borderRadius: 'var(--theme-radius-full)',
            }}
          >
            <X className="w-3 h-3" />
            清除
          </button>
        )}
      </div>

      {/* 色谱条 */}
      <div
        ref={containerRef}
        className="flex rounded-lg overflow-hidden cursor-pointer select-none touch-none"
        style={{
          boxShadow: 'var(--theme-shadow-sm)',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {V_GRADES.map((grade, index) => {
          const selected = isGradeSelected(index)
          const color = getGradeColor(grade)

          return (
            <div
              key={grade}
              className="flex-1 flex items-center justify-center py-2 transition-all duration-150"
              style={{
                backgroundColor: selected ? color : 'var(--theme-surface-variant)',
                color: selected ? 'white' : 'var(--theme-on-surface-variant)',
                fontSize: '10px',
                fontWeight: selected ? 600 : 400,
                transform: selected ? 'scaleY(1.1)' : 'scaleY(1)',
                boxShadow: selected ? 'inset 0 0 0 1px rgba(255,255,255,0.3)' : undefined,
              }}
            >
              {/* 显示简化的等级名 */}
              {grade.replace('V', '')}
            </div>
          )
        })}
      </div>

      {/* 提示文字 */}
      <p
        className="text-xs mt-2 text-center"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        拖动选择难度范围
      </p>
    </div>
  )
}
