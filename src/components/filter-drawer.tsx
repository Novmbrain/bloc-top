'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { FilterChip, FilterChipGroup } from '@/components/filter-chip'
import { GRADE_GROUPS } from '@/lib/filter-constants'
import type { Crag } from '@/types'

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  crags: Crag[]
  selectedCrag: string
  selectedGrades: string[]
  onApply: (crag: string, grades: string[]) => void
}

export function FilterDrawer({
  isOpen,
  onClose,
  crags,
  selectedCrag: initialCrag,
  selectedGrades: initialGrades,
  onApply,
}: FilterDrawerProps) {
  // 本地状态（在抽屉内编辑，点击应用才提交）
  const [localCrag, setLocalCrag] = useState(initialCrag)
  const [localGrades, setLocalGrades] = useState<string[]>(initialGrades)

  // 当抽屉打开时，同步外部状态
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 抽屉打开时需要同步外部筛选状态
      setLocalCrag(initialCrag)
       
      setLocalGrades(initialGrades)
    }
  }, [isOpen, initialCrag, initialGrades])

  // 是否有任何筛选
  const hasFilters = useMemo(
    () => localCrag !== '' || localGrades.length > 0,
    [localCrag, localGrades]
  )

  // 处理岩场选择
  const handleCragSelect = useCallback((cragId: string) => {
    setLocalCrag((prev) => (prev === cragId ? '' : cragId))
  }, [])

  // 处理难度选择
  const handleGradeToggle = useCallback((gradeValue: string) => {
    setLocalGrades((prev) =>
      prev.includes(gradeValue)
        ? prev.filter((g) => g !== gradeValue)
        : [...prev, gradeValue]
    )
  }, [])

  // 清除所有筛选
  const handleClear = useCallback(() => {
    setLocalCrag('')
    setLocalGrades([])
  }, [])

  // 应用筛选
  const handleApply = useCallback(() => {
    onApply(localCrag, localGrades)
    onClose()
  }, [localCrag, localGrades, onApply, onClose])

  return (
    <Drawer isOpen={isOpen} onClose={onClose} height="half" title="筛选线路">
      <div className="px-4 pb-4 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {/* 岩场筛选 */}
          <div className="mb-6">
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              岩场
            </h3>
            <FilterChipGroup>
              <FilterChip
                label="全部"
                selected={localCrag === ''}
                onClick={() => setLocalCrag('')}
              />
              {crags.map((crag) => (
                <FilterChip
                  key={crag.id}
                  label={crag.name}
                  selected={localCrag === crag.id}
                  onClick={() => handleCragSelect(crag.id)}
                />
              ))}
            </FilterChipGroup>
          </div>

          {/* 难度筛选 */}
          <div className="mb-6">
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              难度（可多选）
            </h3>
            <FilterChipGroup>
              {GRADE_GROUPS.map((group) => (
                <FilterChip
                  key={group.value}
                  label={group.label}
                  selected={localGrades.includes(group.value)}
                  onClick={() => handleGradeToggle(group.value)}
                  color={group.color}
                />
              ))}
            </FilterChipGroup>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div
          className="flex gap-3 pt-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--theme-outline-variant)' }}
        >
          <button
            onClick={handleClear}
            disabled={!hasFilters}
            className="flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all active:scale-[0.98]"
            style={{
              backgroundColor: hasFilters
                ? 'var(--theme-surface-variant)'
                : 'var(--theme-surface)',
              color: hasFilters
                ? 'var(--theme-on-surface)'
                : 'var(--theme-outline)',
              borderRadius: 'var(--theme-radius-lg)',
              opacity: hasFilters ? 1 : 0.5,
            }}
          >
            <RotateCcw className="w-4 h-4" />
            <span>清除</span>
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 px-4 font-medium transition-all active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          >
            应用筛选
          </button>
        </div>
      </div>
    </Drawer>
  )
}
