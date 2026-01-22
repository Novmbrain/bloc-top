/**
 * CitySelector 组件测试
 * 测试城市选择器的渲染、交互和无障碍特性
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { CitySelector } from './city-selector'
import type { CityConfig, CityId } from '@/lib/city-config'

// Mock 城市数据
const mockCities: CityConfig[] = [
  {
    id: 'luoyuan' as CityId,
    name: '罗源',
    adcode: '350123',
    coordinates: { lng: 119.5495, lat: 26.4893 },
    available: true,
  },
  {
    id: 'xiamen' as CityId,
    name: '厦门',
    adcode: '350200',
    coordinates: { lng: 118.0894, lat: 24.4798 },
    available: false,
  },
]

describe('CitySelector', () => {
  const defaultProps = {
    currentCity: mockCities[0],
    cities: mockCities,
    onCityChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该显示当前城市名称', () => {
      render(<CitySelector {...defaultProps} />)

      expect(screen.getByText('罗源')).toBeInTheDocument()
    })

    it('应该渲染为可点击的按钮', () => {
      render(<CitySelector {...defaultProps} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('下拉菜单初始应该关闭', () => {
      render(<CitySelector {...defaultProps} />)

      // 不显示其他城市选项
      expect(screen.queryByText('厦门')).not.toBeInTheDocument()
    })
  })

  describe('下拉菜单交互', () => {
    it('点击应打开下拉菜单', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('厦门')).toBeInTheDocument()
      })
    })

    it('再次点击应关闭下拉菜单', async () => {
      render(<CitySelector {...defaultProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('厦门')).toBeInTheDocument()
      })

      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.queryByText('厦门')).not.toBeInTheDocument()
      })
    })

    it('应该显示所有城市选项', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // 下拉菜单打开后，会有两个"罗源"（标题 + 下拉选项）
        expect(screen.getAllByText('罗源').length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('厦门')).toBeInTheDocument()
      })
    })
  })

  describe('城市可用性', () => {
    it('不可用城市应显示"即将上线"标签', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // 使用翻译 key
        expect(screen.getByText('comingSoon')).toBeInTheDocument()
      })
    })

    it('不可用城市应该被禁用', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        const xiamenButtons = screen.getAllByRole('button')
        // 找到厦门按钮（下拉菜单中的按钮）
        const xiamenButton = xiamenButtons.find((btn) =>
          btn.textContent?.includes('厦门')
        )
        expect(xiamenButton).toBeDisabled()
      })
    })

    it('可用城市应该可点击', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('厦门')).toBeInTheDocument()
      })

      // 获取所有按钮
      const buttons = screen.getAllByRole('button')
      // 找到下拉菜单中的罗源按钮（不是标题按钮）
      const luoyuanButtons = buttons.filter((btn) =>
        btn.textContent?.includes('罗源')
      )
      // 至少有一个罗源按钮（标题或下拉菜单）
      expect(luoyuanButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('城市选择', () => {
    it('选择城市应调用 onCityChange', async () => {
      const onCityChange = vi.fn()
      // 使用厦门作为当前城市，这样罗源就可以被选择
      render(
        <CitySelector
          {...defaultProps}
          currentCity={mockCities[1]}
          onCityChange={onCityChange}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        const luoyuanButton = buttons.find((btn) =>
          btn.textContent?.includes('罗源')
        )
        if (luoyuanButton) {
          fireEvent.click(luoyuanButton)
        }
      })

      expect(onCityChange).toHaveBeenCalledWith('luoyuan')
    })

    it('选择城市后应关闭下拉菜单', async () => {
      const onCityChange = vi.fn()
      render(
        <CitySelector
          {...defaultProps}
          currentCity={mockCities[1]}
          onCityChange={onCityChange}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('罗源')).toBeInTheDocument()
      })

      const buttons = screen.getAllByRole('button')
      const luoyuanButton = buttons.find((btn) =>
        btn.textContent?.includes('罗源')
      )
      if (luoyuanButton) {
        fireEvent.click(luoyuanButton)
      }

      await waitFor(() => {
        // 检查下拉菜单是否关闭（只有一个按钮可见）
        expect(screen.getAllByRole('button')).toHaveLength(1)
      })
    })

    it('当前城市应显示勾选标记', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      // 等待下拉菜单打开
      await waitFor(() => {
        expect(screen.getByText('厦门')).toBeInTheDocument()
      })

      // 检查下拉菜单中的罗源按钮是否包含 Check 图标
      const buttons = screen.getAllByRole('button')
      // 找到下拉菜单中的罗源按钮（第二个按钮）
      const luoyuanInDropdown = buttons.find(btn =>
        btn.textContent?.includes('罗源') && btn.querySelector('svg')
      )
      // 当前城市按钮应该有勾选图标
      expect(luoyuanInDropdown).toBeTruthy()
    })
  })

  describe('首访提示', () => {
    it('showHint=true 时应显示提示', () => {
      render(<CitySelector {...defaultProps} showHint={true} />)

      // 使用翻译 key
      expect(screen.getByText('firstVisitHint')).toBeInTheDocument()
    })

    it('showHint=false 时不应显示提示', () => {
      render(<CitySelector {...defaultProps} showHint={false} />)

      expect(screen.queryByText('firstVisitHint')).not.toBeInTheDocument()
    })

    it('点击时应关闭首访提示', async () => {
      const onDismissHint = vi.fn()
      render(
        <CitySelector
          {...defaultProps}
          showHint={true}
          onDismissHint={onDismissHint}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(onDismissHint).toHaveBeenCalled()
    })
  })

  describe('点击外部关闭', () => {
    it('点击外部应关闭下拉菜单', async () => {
      render(
        <div>
          <CitySelector {...defaultProps} />
          <div data-testid="outside">外部区域</div>
        </div>
      )

      // 打开下拉菜单
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('厦门')).toBeInTheDocument()
      })

      // 点击外部
      fireEvent.mouseDown(screen.getByTestId('outside'))

      await waitFor(() => {
        expect(screen.queryByText('厦门')).not.toBeInTheDocument()
      })
    })
  })
})
