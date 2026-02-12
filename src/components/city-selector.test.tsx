/**
 * CitySelector 组件测试
 * 测试两级城市选择器（地级市→区/县）的渲染、交互和无障碍特性
 *
 * 组件通过 props 接收 cities 和 prefectures 数据（来自 DB）。
 * 测试环境中 next-intl mock 返回翻译 key 作为文本。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { CitySelector } from './city-selector'
import type { CityConfig, PrefectureConfig } from '@/types'

// ==================== 测试数据 ====================

const luoyuanCity: CityConfig = {
  id: 'luoyuan',
  name: '罗源',
  shortName: '罗源',
  adcode: '350123',
  coordinates: { lng: 119.5495, lat: 26.4893 },
  available: true,
}

const xiamenCity: CityConfig = {
  id: 'xiamen',
  name: '厦门',
  shortName: '厦门',
  adcode: '350200',
  coordinates: { lng: 118.0894, lat: 24.4798 },
  available: true,
}

const changleCity: CityConfig = {
  id: 'changle',
  name: '长乐',
  shortName: '长乐',
  adcode: '350112',
  coordinates: { lng: 119.523, lat: 25.963 },
  available: false, // 测试不可用状态
}

const mockCities: CityConfig[] = [luoyuanCity, xiamenCity, changleCity]

const mockPrefectures: PrefectureConfig[] = [
  {
    id: 'fuzhou',
    name: '福州',
    shortName: '福州',
    districts: ['luoyuan', 'changle'],
    defaultDistrict: 'luoyuan',
  },
  {
    id: 'xiamen',
    name: '厦门',
    shortName: '厦门',
    districts: ['xiamen'],
    defaultDistrict: 'xiamen',
  },
]

// ==================== 测试 ====================

describe('CitySelector', () => {
  const defaultProps = {
    currentCity: luoyuanCity,
    cities: mockCities,
    prefectures: mockPrefectures,
    onCityChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该显示「地级市 · 区名」格式的标题', () => {
      render(<CitySelector {...defaultProps} />)

      // luoyuan 属于福州市，标题格式：「福州 · 罗源」
      expect(screen.getByText('福州 · 罗源')).toBeInTheDocument()
    })

    it('地级市名等于区名时只显示一次', () => {
      render(<CitySelector {...defaultProps} currentCity={xiamenCity} />)

      // 厦门市 → 厦门区，名称相同，不重复
      expect(screen.getByText('厦门')).toBeInTheDocument()
    })

    it('应该渲染为可点击的按钮', () => {
      render(<CitySelector {...defaultProps} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('下拉菜单初始应该关闭', () => {
      render(<CitySelector {...defaultProps} />)

      // 不显示地级市选项（翻译 key）
      expect(screen.queryByText('prefectureFuzhou')).not.toBeInTheDocument()
      expect(screen.queryByText('prefectureXiamen')).not.toBeInTheDocument()
    })
  })

  describe('下拉菜单交互', () => {
    it('点击应打开下拉菜单', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // 两个地级市选项（翻译 key）
        expect(screen.getByText('prefectureFuzhou')).toBeInTheDocument()
        expect(screen.getByText('prefectureXiamen')).toBeInTheDocument()
      })
    })

    it('多区地级市应自动展开当前选中区的父级', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // currentCity=luoyuan → 福州应自动展开，显示所有子区域
        expect(screen.getByText('罗源')).toBeInTheDocument()
        expect(screen.getByText('长乐')).toBeInTheDocument()
      })
    })

    it('再次点击应关闭下拉菜单', async () => {
      render(<CitySelector {...defaultProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('prefectureXiamen')).toBeInTheDocument()
      })

      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.queryByText('prefectureXiamen')).not.toBeInTheDocument()
      })
    })

    it('应该显示所有地级市选项', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('prefectureFuzhou')).toBeInTheDocument()
        expect(screen.getByText('prefectureXiamen')).toBeInTheDocument()
      })
    })
  })

  describe('城市可用性', () => {
    it('不可用区域应显示"即将上线"标签', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // 长乐 (changle) 在 mockCities 中 available: false
        expect(screen.getByText('comingSoon')).toBeInTheDocument()
      })
    })

    it('不可用区域应该被禁用', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // 福州自动展开，长乐（不可用）按钮应被禁用
        const buttons = screen.getAllByRole('button')
        const changleButton = buttons.find((btn) =>
          btn.textContent?.includes('长乐')
        )
        expect(changleButton).toBeDisabled()
      })
    })

    it('可用区域应该可点击', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // 福州自动展开，罗源（可用）按钮应可点击
        const buttons = screen.getAllByRole('button')
        const luoyuanButton = buttons.find((btn) =>
          btn.textContent?.includes('罗源') &&
          !btn.textContent?.includes('福州')
        )
        expect(luoyuanButton).toBeDefined()
        expect(luoyuanButton).not.toBeDisabled()
      })
    })
  })

  describe('城市选择', () => {
    it('单区地级市点击直接选中', async () => {
      const onCityChange = vi.fn()
      render(
        <CitySelector {...defaultProps} onCityChange={onCityChange} />
      )

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('prefectureXiamen')).toBeInTheDocument()
      })

      // 厦门是单区地级市，点击直接选中
      fireEvent.click(screen.getByText('prefectureXiamen'))

      expect(onCityChange).toHaveBeenCalledWith('xiamen')
    })

    it('多区地级市需展开后选择区域', async () => {
      const onCityChange = vi.fn()
      render(
        <CitySelector
          {...defaultProps}
          currentCity={xiamenCity}
          onCityChange={onCityChange}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      // 先点击福州展开子区域
      await waitFor(() => {
        expect(screen.getByText('prefectureFuzhou')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('prefectureFuzhou'))

      // 再选择罗源
      await waitFor(() => {
        expect(screen.getByText('罗源')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('罗源'))

      expect(onCityChange).toHaveBeenCalledWith('luoyuan')
    })

    it('选择城市后应关闭下拉菜单', async () => {
      const onCityChange = vi.fn()
      render(
        <CitySelector {...defaultProps} onCityChange={onCityChange} />
      )

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('prefectureXiamen')).toBeInTheDocument()
      })

      // 点击厦门（单区，直接选中并关闭）
      fireEvent.click(screen.getByText('prefectureXiamen'))

      await waitFor(() => {
        // 下拉菜单应已关闭
        expect(screen.queryByText('prefectureXiamen')).not.toBeInTheDocument()
      })
    })

    it('当前城市应显示勾选标记', async () => {
      render(<CitySelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // 福州自动展开，找到罗源区域按钮（非标题按钮）
        const buttons = screen.getAllByRole('button')
        const luoyuanInDropdown = buttons.find(btn =>
          btn.textContent?.includes('罗源') &&
          !btn.textContent?.includes('福州') &&
          btn.querySelector('svg')
        )
        // 当前城市按钮应有勾选图标 (Check SVG)
        expect(luoyuanInDropdown).toBeTruthy()
      })
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
        expect(screen.getByText('prefectureXiamen')).toBeInTheDocument()
      })

      // 点击外部
      fireEvent.mouseDown(screen.getByTestId('outside'))

      await waitFor(() => {
        expect(screen.queryByText('prefectureXiamen')).not.toBeInTheDocument()
      })
    })
  })
})
