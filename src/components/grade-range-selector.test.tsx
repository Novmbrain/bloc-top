/**
 * GradeRangeSelector 组件测试
 * 测试难度色谱条的交互行为：
 * - 单击切换（toggle）
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
        expect(screen.getByText(num)).toBeInTheDocument()
      })
    })

    it('空选择时应显示"全部难度"', () => {
      render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      // 使用翻译键匹配
      expect(screen.getByText('allGrades')).toBeInTheDocument()
    })

    it('单个选择时应显示难度名称', () => {
      render(
        <GradeRangeSelector
          selectedGrades={['V5']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('V5')).toBeInTheDocument()
    })

    it('连续范围选择时应显示范围', () => {
      render(
        <GradeRangeSelector
          selectedGrades={['V2', 'V3', 'V4', 'V5']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('V2 - V5')).toBeInTheDocument()
    })

    it('不连续选择时应显示选中数量', () => {
      render(
        <GradeRangeSelector
          selectedGrades={['V0', 'V5', 'V10']}
          onChange={mockOnChange}
        />
      )

      // 使用翻译键匹配（参数会被替换）
      expect(screen.getByText(/selectedGrades/i)).toBeInTheDocument()
    })

    it('有选择时应显示清除按钮', () => {
      render(
        <GradeRangeSelector
          selectedGrades={['V5']}
          onChange={mockOnChange}
        />
      )

      // 使用翻译键匹配
      expect(screen.getByText('clear')).toBeInTheDocument()
    })

    it('无选择时不应显示清除按钮', () => {
      render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.queryByText('clear')).not.toBeInTheDocument()
    })
  })

  describe('单击交互', () => {
    /**
     * 注意：以下测试需要真实浏览器环境（Playwright）
     * 因为 jsdom 中 getBoundingClientRect() 返回 { width: 0, height: 0 }
     * 导致位置计算无法正常工作
     *
     * 在 Playwright 组件测试中应覆盖：
     * - 单击切换选择
     * - 拖动范围选择
     * - 复合选择
     */

    it('色谱条容器应支持鼠标事件', () => {
      const { container } = render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      // 验证色谱条容器存在且可交互
      const colorBar = container.querySelector('.touch-none')
      expect(colorBar).toBeInTheDocument()
      expect(colorBar).toHaveClass('cursor-pointer')
    })

    it('色谱条容器应支持触摸事件', () => {
      const { container } = render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      const colorBar = container.querySelector('.touch-none')
      expect(colorBar).toBeInTheDocument()

      // 验证触摸事件可以触发
      fireEvent.touchStart(colorBar!, {
        touches: [{ clientX: 100, clientY: 0 }],
      })

      // 组件应进入拖动状态（内部状态，这里只验证不报错）
      fireEvent.touchEnd(colorBar!)
    })

    it('mouseDown 应触发交互流程', () => {
      const { container } = render(
        <GradeRangeSelector
          selectedGrades={[]}
          onChange={mockOnChange}
        />
      )

      const colorBar = container.querySelector('.touch-none')

      // mouseDown 后 mouseUp 应触发 onChange
      // 虽然在 jsdom 中位置计算有问题，但交互流程应该正常
      fireEvent.mouseDown(colorBar!, { clientX: 0 })
      fireEvent.mouseUp(colorBar!)

      // 应该调用 onChange（位置可能不正确，但流程正常）
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

      // 使用翻译键匹配
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

      // 使用翻译键匹配
      expect(screen.getByText('gradeHint')).toBeInTheDocument()
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

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})
