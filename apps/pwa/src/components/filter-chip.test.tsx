/**
 * FilterChip 组件测试
 * 测试筛选芯片的基本交互和样式
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { FilterChip, FilterChipGroup } from './filter-chip'

describe('FilterChip', () => {
  describe('渲染', () => {
    it('应渲染标签文本', () => {
      render(
        <FilterChip
          label="全部"
          selected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByText('全部')).toBeTruthy()
    })

    it('应渲染为 button 元素', () => {
      render(
        <FilterChip
          label="测试"
          selected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByRole('button')).toBeTruthy()
    })
  })

  describe('点击交互', () => {
    it('点击应触发 onClick 回调', () => {
      const handleClick = vi.fn()

      render(
        <FilterChip
          label="测试"
          selected={false}
          onClick={handleClick}
        />
      )

      fireEvent.click(screen.getByText('测试'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('多次点击应多次触发回调', () => {
      const handleClick = vi.fn()

      render(
        <FilterChip
          label="测试"
          selected={false}
          onClick={handleClick}
        />
      )

      const button = screen.getByText('测试')
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(3)
    })
  })

  describe('选中状态', () => {
    it('未选中时应有正确的样式类', () => {
      render(
        <FilterChip
          label="测试"
          selected={false}
          onClick={() => {}}
        />
      )

      const button = screen.getByRole('button')
      expect((button as HTMLElement).classList.contains('text-[var(--theme-on-surface-variant)]')).toBe(true)
    })

    it('选中时应有正确的样式类', () => {
      render(
        <FilterChip
          label="测试"
          selected={true}
          onClick={() => {}}
        />
      )

      const button = screen.getByRole('button')
      expect((button as HTMLElement).classList.contains('text-[var(--theme-on-primary)]')).toBe(true)
    })
  })

  describe('自定义颜色', () => {
    it('选中时应使用自定义颜色作为背景', () => {
      render(
        <FilterChip
          label="V5"
          selected={true}
          onClick={() => {}}
          color="#FF9800"
        />
      )

      const button = screen.getByRole('button')
      expect((button as HTMLElement).style.backgroundColor).toBe('rgb(255, 152, 0)')
    })

    it('未选中时应忽略自定义颜色并使用 glass-light', () => {
      render(
        <FilterChip
          label="V5"
          selected={false}
          onClick={() => {}}
          color="#FF9800"
        />
      )

      const button = screen.getByRole('button')
      expect((button as HTMLElement).classList.contains('glass-light')).toBe(true)
      expect((button as HTMLElement).style.backgroundColor).not.toBe('rgb(255, 152, 0)')
    })
  })

  describe('自定义样式', () => {
    it('应支持 className 属性', () => {
      render(
        <FilterChip
          label="测试"
          selected={false}
          onClick={() => {}}
          className="custom-class"
        />
      )

      expect((screen.getByRole('button') as HTMLElement).classList.contains('custom-class')).toBe(true)
    })
  })
})

describe('FilterChipGroup', () => {
  describe('渲染', () => {
    it('应渲染所有子元素', () => {
      render(
        <FilterChipGroup>
          <FilterChip label="A" selected={false} onClick={() => {}} />
          <FilterChip label="B" selected={false} onClick={() => {}} />
          <FilterChip label="C" selected={false} onClick={() => {}} />
        </FilterChipGroup>
      )

      expect(screen.getByText('A')).toBeTruthy()
      expect(screen.getByText('B')).toBeTruthy()
      expect(screen.getByText('C')).toBeTruthy()
    })

    it('应有正确的容器样式', () => {
      const { container } = render(
        <FilterChipGroup>
          <FilterChip label="测试" selected={false} onClick={() => {}} />
        </FilterChipGroup>
      )

      const group = container.firstChild as HTMLElement
      expect(group.classList.contains('flex')).toBe(true)
      expect(group.classList.contains('gap-2')).toBe(true)
      expect(group.classList.contains('overflow-x-auto')).toBe(true)
    })
  })

  describe('自定义样式', () => {
    it('应支持 className 属性', () => {
      const { container } = render(
        <FilterChipGroup className="custom-group">
          <FilterChip label="测试" selected={false} onClick={() => {}} />
        </FilterChipGroup>
      )

      expect((container.firstChild as HTMLElement).classList.contains('custom-group')).toBe(true)
    })
  })
})
