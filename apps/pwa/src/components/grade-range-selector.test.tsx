/**
 * GradeRangeSelector 组件测试
 * 测试难度色谱条的交互行为：
 * - 点选单个等级
 * - 拖动范围选择
 * - 清除选择
 * - 显示状态
 *
 * 注意：由于组件使用 next-intl，测试中 mock 会返回翻译键而非实际文本
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { GradeRangeSelector } from './grade-range-selector'
import { V_GRADES } from '@/lib/filter-constants'

describe('GradeRangeSelector', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('渲染', () => {
    it('应渲染所有难度等级', () => {
      render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      // 检查是否渲染了所有 14 个难度（显示为数字 0-13）
      V_GRADES.forEach(grade => {
        const num = grade.replace('V', '')
        expect(screen.getByText(num)).toBeTruthy()
      })
    })

    it('空选择时应显示"全部难度"', () => {
      render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('allGrades')).toBeTruthy()
    })

    it('单个选择时应显示难度名称', () => {
      render(
        <GradeRangeSelector
          selectedGrades={['V5']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('V5')).toBeTruthy()
    })

    it('连续范围选择时应显示范围', () => {
      render(
        <GradeRangeSelector
          selectedGrades={['V2', 'V3', 'V4', 'V5']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('V2 - V5')).toBeTruthy()
    })

    it('有选择时应显示清除按钮', () => {
      render(
        <GradeRangeSelector
          selectedGrades={['V5']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('clear')).toBeTruthy()
    })

    it('无选择时不应显示清除按钮', () => {
      render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.queryByText('clear')).toBeNull()
    })
  })

  describe('交互', () => {
    it('色谱条容器应支持鼠标事件', () => {
      const { container } = render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      const colorBar = container.querySelector('.touch-none')
      expect(colorBar).toBeTruthy()
      expect((colorBar as HTMLElement).classList.contains('cursor-pointer')).toBe(true)
    })

    it('色谱条容器应支持触摸事件', () => {
      const { container } = render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      const colorBar = container.querySelector('.touch-none')
      expect(colorBar).toBeTruthy()

      fireEvent.touchStart(colorBar!, {
        touches: [{ clientX: 100, clientY: 0 }],
      })

      fireEvent.touchEnd(colorBar!)
    })

    it('mouseDown + mouseUp 应触发 onChange', () => {
      const { container } = render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      const colorBar = container.querySelector('.touch-none')

      fireEvent.mouseDown(colorBar!, { clientX: 0 })
      fireEvent.mouseUp(colorBar!)

      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  describe('清除功能', () => {
    it('点击清除按钮应清空所有选择', () => {
      render(
        <GradeRangeSelector
          selectedGrades={['V0', 'V1', 'V2']}
          onChange={mockOnChange}
        />
      )

      const clearButton = screen.getByText('clear')
      fireEvent.click(clearButton)

      expect(mockOnChange).toHaveBeenCalledWith([])
    })
  })

  describe('提示文字', () => {
    it('应显示操作提示', () => {
      render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('gradeHint')).toBeTruthy()
    })
  })

  describe('自定义样式', () => {
    it('应支持 className 属性', () => {
      const { container } = render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
          className="custom-class"
        />
      )

      expect((container.firstChild as HTMLElement).classList.contains('custom-class')).toBe(true)
    })
  })
})
