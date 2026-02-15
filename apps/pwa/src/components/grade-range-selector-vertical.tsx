'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'

import { getGradeColor } from '@/lib/tokens'

const DRAG_THRESHOLD = 8
const GRADE_HINT_SEEN_KEY = 'grade-selector-hint-seen'

interface GradeRangeSelectorVerticalProps {
  availableGrades: string[]
  selectedGrades: string[]
  onChange: (grades: string[]) => void
  className?: string
}

/**
 * 竖向难度色谱条组件
 * 固定在页面左侧，支持上下滑动选择连续范围
 */
export function GradeRangeSelectorVertical({
  availableGrades,
  selectedGrades,
  onChange,
  className,
}: GradeRangeSelectorVerticalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const [hasMoved, setHasMoved] = useState(false)
  const dragStartY = useRef<number | null>(null)

  const [showPulse, setShowPulse] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem(GRADE_HINT_SEEN_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时读取 localStorage
        setShowPulse(true)
      }
    } catch { /* SSR */ }
  }, [])

  const [optimisticSelection, setOptimisticSelection] = useState<string[] | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prop 变化时重置
    setOptimisticSelection(null)
  }, [selectedGrades])

  const displayedSelection = optimisticSelection ?? selectedGrades

  // 竖向：用 clientY 计算索引
  const getGradeIndexFromPosition = useCallback((clientY: number): number => {
    if (!containerRef.current) return 0
    const rect = containerRef.current.getBoundingClientRect()
    const y = clientY - rect.top
    const index = Math.floor((y / rect.height) * availableGrades.length)
    return Math.max(0, Math.min(availableGrades.length - 1, index))
  }, [availableGrades])

  const getSelectedFromRange = useCallback((start: number, end: number): string[] => {
    const min = Math.min(start, end)
    const max = Math.max(start, end)
    return availableGrades.slice(min, max + 1)
  }, [availableGrades])

  const handleDragStart = useCallback((clientY: number) => {
    const index = getGradeIndexFromPosition(clientY)
    setIsDragging(true)
    setDragStart(index)
    setDragEnd(index)
    setHasMoved(false)
    dragStartY.current = clientY

    if (showPulse) {
      setShowPulse(false)
      try { localStorage.setItem(GRADE_HINT_SEEN_KEY, '1') } catch { /* ignore */ }
    }
  }, [getGradeIndexFromPosition, showPulse])

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging || dragStart === null) return
    const index = getGradeIndexFromPosition(clientY)

    if (index !== dragStart && dragStartY.current !== null && Math.abs(clientY - dragStartY.current) >= DRAG_THRESHOLD) {
      setHasMoved(true)
    }
    setDragEnd(index)
  }, [isDragging, dragStart, getGradeIndexFromPosition])

  const handleDragEnd = useCallback(() => {
    if (!isDragging || dragStart === null || dragEnd === null) {
      setIsDragging(false)
      setHasMoved(false)
      return
    }

    const newSelection = hasMoved
      ? getSelectedFromRange(dragStart, dragEnd)
      : [availableGrades[dragStart]]

    setOptimisticSelection(newSelection)
    onChange(newSelection)

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
    setHasMoved(false)
    dragStartY.current = null
  }, [isDragging, dragStart, dragEnd, hasMoved, getSelectedFromRange, onChange, availableGrades])

  // 鼠标事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientY)
  }, [handleDragStart])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientY)
  }, [handleDragMove])

  const handleMouseUp = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // 触摸事件
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY)
  }, [handleDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY)
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // 全局鼠标事件
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

  const isGradeSelected = useCallback((index: number): boolean => {
    if (isDragging && hasMoved && dragStart !== null && dragEnd !== null) {
      const min = Math.min(dragStart, dragEnd)
      const max = Math.max(dragStart, dragEnd)
      return index >= min && index <= max
    }
    return displayedSelection.includes(availableGrades[index])
  }, [isDragging, hasMoved, dragStart, dragEnd, displayedSelection, availableGrades])

  const handleClear = useCallback(() => {
    setOptimisticSelection([])
    onChange([])
  }, [onChange])

  if (availableGrades.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 ${className ?? ''}`}>
      {/* 清除按钮 */}
      {displayedSelection.length > 0 && (
        <button
          onClick={handleClear}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
            color: 'var(--theme-primary)',
          }}
          aria-label="清除难度筛选"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 竖向色谱条 */}
      <div
        ref={containerRef}
        className={`flex flex-col rounded-lg overflow-hidden cursor-pointer select-none touch-none${showPulse ? ' animate-pulse' : ''}`}
        style={{
          width: 36,
          boxShadow: showPulse
            ? '0 0 0 2px var(--theme-primary), 0 0 12px color-mix(in srgb, var(--theme-primary) 30%, transparent)'
            : 'var(--theme-shadow-sm)',
          transition: 'box-shadow 0.3s ease',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {availableGrades.map((grade, index) => {
          const selected = isGradeSelected(index)
          const color = getGradeColor(grade)

          return (
            <div
              key={grade}
              className="flex items-center justify-center transition-all duration-150"
              style={{
                minHeight: 28,
                backgroundColor: selected ? color : 'var(--theme-surface-variant)',
                color: selected ? 'white' : 'var(--theme-on-surface-variant)',
                fontSize: '9px',
                fontWeight: selected ? 700 : 400,
                transform: selected ? 'scaleX(1.15)' : 'scaleX(1)',
                boxShadow: selected ? 'inset 0 0 0 1px rgba(255,255,255,0.3)' : undefined,
              }}
            >
              {grade.replace('V', '')}
            </div>
          )
        })}
      </div>
    </div>
  )
}
