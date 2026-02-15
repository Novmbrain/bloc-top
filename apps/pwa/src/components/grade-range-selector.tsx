'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { V_GRADES } from '@/lib/filter-constants'
import { getGradeColor } from '@/lib/tokens'

// 手指微抖阈值（像素），小于此距离视为点选而非拖动
const DRAG_THRESHOLD = 8
// localStorage key 标记用户是否已和难度选择器交互过
const GRADE_HINT_SEEN_KEY = 'grade-selector-hint-seen'

interface GradeRangeSelectorProps {
  selectedGrades: string[]
  onChange: (grades: string[]) => void
  className?: string
}

/**
 * 难度色谱条组件
 * 仅支持滑动选择连续范围：
 * 1. 点击：选中单个等级
 * 2. 拖动：选择连续范围
 * 3. 清除按钮：清除所有选择
 */
export function GradeRangeSelector({
  selectedGrades,
  onChange,
  className,
}: GradeRangeSelectorProps) {
  const t = useTranslations('RouteList')
  const tCommon = useTranslations('Common')
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  // 追踪是否发生了实际的拖动移动（用于区分点选和拖动）
  const [hasMoved, setHasMoved] = useState(false)
  // 记录触摸起始位置，用于计算移动距离阈值
  const dragStartX = useRef<number | null>(null)

  // 首次使用提示：脉冲动画
  const [showPulse, setShowPulse] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem(GRADE_HINT_SEEN_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 合理用例：挂载时读取 localStorage 初始化状态
        setShowPulse(true)
      }
    } catch { /* SSR or localStorage unavailable */ }
  }, [])

  // 本地乐观状态：在 URL 更新期间保持显示新选择
  const [optimisticSelection, setOptimisticSelection] = useState<string[] | null>(null)

  // 当 selectedGrades prop 更新时，清除乐观状态
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 合理用例：prop 变化时重置内部状态
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
    setHasMoved(false)
    dragStartX.current = clientX

    // 首次交互后关闭脉冲动画
    if (showPulse) {
      setShowPulse(false)
      try { localStorage.setItem(GRADE_HINT_SEEN_KEY, '1') } catch { /* ignore */ }
    }
  }, [getGradeIndexFromPosition, showPulse])

  // 处理拖动移动
  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || dragStart === null) return
    const index = getGradeIndexFromPosition(clientX)

    if (index !== dragStart && dragStartX.current !== null && Math.abs(clientX - dragStartX.current) >= DRAG_THRESHOLD) {
      setHasMoved(true)
    }
    setDragEnd(index)
  }, [isDragging, dragStart, getGradeIndexFromPosition])

  // 处理拖动结束
  const handleDragEnd = useCallback(() => {
    if (!isDragging || dragStart === null || dragEnd === null) {
      setIsDragging(false)
      setHasMoved(false)
      return
    }

    // 无论点选还是拖动，都产出连续范围
    const newSelection = hasMoved
      ? getSelectedFromRange(dragStart, dragEnd)
      : [V_GRADES[dragStart] as string]

    setOptimisticSelection(newSelection)
    onChange(newSelection)

    // 清除拖动状态
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
    setHasMoved(false)
    dragStartX.current = null
  }, [isDragging, dragStart, dragEnd, hasMoved, getSelectedFromRange, onChange])

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
    // 拖动中且已经移动了 → 显示范围预览
    if (isDragging && hasMoved && dragStart !== null && dragEnd !== null) {
      const min = Math.min(dragStart, dragEnd)
      const max = Math.max(dragStart, dragEnd)
      return index >= min && index <= max
    }
    // 否则显示实际选中状态
    return displayedSelection.includes(V_GRADES[index])
  }, [isDragging, hasMoved, dragStart, dragEnd, displayedSelection])

  // 清除选择
  const handleClear = useCallback(() => {
    setOptimisticSelection([])
    onChange([])
  }, [onChange])

  // 计算显示的范围文本
  const getRangeText = (): string => {
    // 拖动范围预览
    if (isDragging && hasMoved && dragStart !== null && dragEnd !== null) {
      const min = Math.min(dragStart, dragEnd)
      const max = Math.max(dragStart, dragEnd)
      if (min === max) return V_GRADES[min]
      return `${V_GRADES[min]} - ${V_GRADES[max]}`
    }

    if (displayedSelection.length === 0) return t('allGrades')
    if (displayedSelection.length === 1) return displayedSelection[0]

    // 选择永远是连续的，直接取首尾
    const indices = displayedSelection
      .map(g => V_GRADES.indexOf(g as typeof V_GRADES[number]))
      .filter(i => i >= 0)
      .sort((a, b) => a - b)

    if (indices.length === 0) return t('allGrades')

    const min = indices[0]
    const max = indices[indices.length - 1]
    if (min === max) return V_GRADES[min]
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
            {tCommon('clear')}
          </button>
        )}
      </div>

      {/* 色谱条 */}
      <div
        ref={containerRef}
        className={`flex rounded-lg overflow-hidden cursor-pointer select-none touch-none${showPulse ? ' animate-pulse' : ''}`}
        style={{
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
              {grade.replace('V', '')}
            </div>
          )
        })}
      </div>

      {/* 提示文字 */}
      <p
        className="text-xs mt-2 text-center transition-colors duration-300"
        style={{
          color: showPulse ? 'var(--theme-primary)' : 'var(--theme-on-surface-variant)',
          fontWeight: showPulse ? 500 : 400,
        }}
      >
        {showPulse ? '👆 ' : ''}{t('gradeHint')}
      </p>
    </div>
  )
}
