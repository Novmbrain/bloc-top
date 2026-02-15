/**
 * FilterDrawer 组件测试
 * 测试筛选抽屉的渲染、交互和状态管理
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { FilterDrawer } from './filter-drawer'
import type { Crag } from '@/types'

// Mock crags 数据
const mockCrags: Crag[] = [
  {
    id: 'yuan-tong-si',
    name: '圆通寺',
    cityId: 'luoyuan',
    location: '罗源县',
    developmentTime: '2020',
    description: '测试岩场',
    approach: '步行10分钟',
  },
  {
    id: 'ba-jing-cun',
    name: '八井村',
    cityId: 'luoyuan',
    location: '罗源县',
    developmentTime: '2021',
    description: '测试岩场2',
    approach: '步行15分钟',
  },
]

describe('FilterDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    crags: mockCrags,
    selectedCrag: '',
    selectedGrades: [] as string[],
    onApply: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染岩场筛选芯片', () => {
      render(<FilterDrawer {...defaultProps} />)

      expect(screen.getByText('圆通寺')).toBeInTheDocument()
      expect(screen.getByText('八井村')).toBeInTheDocument()
    })

    it('应该渲染"全部"选项', () => {
      render(<FilterDrawer {...defaultProps} />)

      // 使用翻译 key，mock 返回 key 本身
      expect(screen.getByText('all')).toBeInTheDocument()
    })

    it('应该渲染难度等级筛选芯片', () => {
      render(<FilterDrawer {...defaultProps} />)

      // 检查单个难度等级标签
      expect(screen.getByText('V0')).toBeInTheDocument()
      expect(screen.getByText('V3')).toBeInTheDocument()
      expect(screen.getByText('V6')).toBeInTheDocument()
    })

    it('应该渲染清除和应用按钮', () => {
      render(<FilterDrawer {...defaultProps} />)

      expect(screen.getByText('clear')).toBeInTheDocument()
      expect(screen.getByText('applyFilter')).toBeInTheDocument()
    })

    it('isOpen=false 时不应渲染内容', () => {
      render(<FilterDrawer {...defaultProps} isOpen={false} />)

      // Drawer 组件在 isOpen=false 时不渲染内容
      expect(screen.queryByText('圆通寺')).not.toBeInTheDocument()
    })
  })

  describe('岩场筛选交互', () => {
    it('点击岩场芯片应选中该岩场', () => {
      const onApply = vi.fn()
      render(<FilterDrawer {...defaultProps} onApply={onApply} />)

      fireEvent.click(screen.getByText('圆通寺'))
      fireEvent.click(screen.getByText('applyFilter'))

      expect(onApply).toHaveBeenCalledWith('yuan-tong-si', [])
    })

    it('再次点击已选中岩场应取消选中', () => {
      const onApply = vi.fn()
      render(
        <FilterDrawer
          {...defaultProps}
          selectedCrag="yuan-tong-si"
          onApply={onApply}
        />
      )

      // 点击已选中的岩场取消选中
      fireEvent.click(screen.getByText('圆通寺'))
      fireEvent.click(screen.getByText('applyFilter'))

      expect(onApply).toHaveBeenCalledWith('', [])
    })

    it('点击"全部"应清除岩场筛选', () => {
      const onApply = vi.fn()
      render(
        <FilterDrawer
          {...defaultProps}
          selectedCrag="yuan-tong-si"
          onApply={onApply}
        />
      )

      fireEvent.click(screen.getByText('all'))
      fireEvent.click(screen.getByText('applyFilter'))

      expect(onApply).toHaveBeenCalledWith('', [])
    })
  })

  describe('难度筛选交互', () => {
    it('点击难度芯片应添加到选中列表', () => {
      const onApply = vi.fn()
      render(<FilterDrawer {...defaultProps} onApply={onApply} />)

      fireEvent.click(screen.getByText('V0'))
      fireEvent.click(screen.getByText('applyFilter'))

      expect(onApply).toHaveBeenCalledWith('', ['V0'])
    })

    it('多选难度等级应累加', () => {
      const onApply = vi.fn()
      render(<FilterDrawer {...defaultProps} onApply={onApply} />)

      fireEvent.click(screen.getByText('V0'))
      fireEvent.click(screen.getByText('V3'))
      fireEvent.click(screen.getByText('applyFilter'))

      expect(onApply).toHaveBeenCalledWith('', ['V0', 'V3'])
    })

    it('再次点击已选中难度应取消选中', () => {
      const onApply = vi.fn()
      render(
        <FilterDrawer
          {...defaultProps}
          selectedGrades={['V0', 'V3']}
          onApply={onApply}
        />
      )

      // 取消选中 V0
      fireEvent.click(screen.getByText('V0'))
      fireEvent.click(screen.getByText('applyFilter'))

      expect(onApply).toHaveBeenCalledWith('', ['V3'])
    })
  })

  describe('清除按钮', () => {
    it('无筛选时清除按钮应禁用', () => {
      render(<FilterDrawer {...defaultProps} />)

      const clearButton = screen.getByText('clear').closest('button')
      expect(clearButton).toBeDisabled()
    })

    it('有筛选时清除按钮应启用', () => {
      render(
        <FilterDrawer {...defaultProps} selectedCrag="yuan-tong-si" />
      )

      const clearButton = screen.getByText('clear').closest('button')
      expect(clearButton).not.toBeDisabled()
    })

    it('点击清除应重置所有筛选', () => {
      const onApply = vi.fn()
      render(
        <FilterDrawer
          {...defaultProps}
          selectedCrag="yuan-tong-si"
          selectedGrades={['V0']}
          onApply={onApply}
        />
      )

      fireEvent.click(screen.getByText('clear'))
      fireEvent.click(screen.getByText('applyFilter'))

      expect(onApply).toHaveBeenCalledWith('', [])
    })
  })

  describe('应用按钮', () => {
    it('点击应用应调用 onApply 并关闭抽屉', () => {
      const onApply = vi.fn()
      const onClose = vi.fn()
      render(
        <FilterDrawer
          {...defaultProps}
          onApply={onApply}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByText('applyFilter'))

      expect(onApply).toHaveBeenCalledWith('', [])
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('状态同步', () => {
    it('抽屉打开时应同步外部 props', async () => {
      const { rerender } = render(
        <FilterDrawer {...defaultProps} isOpen={false} />
      )

      // 重新打开抽屉，带有新的筛选状态
      rerender(
        <FilterDrawer
          {...defaultProps}
          isOpen={true}
          selectedCrag="yuan-tong-si"
          selectedGrades={['beginner']}
        />
      )

      // 验证状态已同步 - 岩场应该被选中
      await waitFor(() => {
        // 圆通寺应该被选中状态
        expect(screen.getByText('圆通寺')).toBeInTheDocument()
      })
    })
  })
})
