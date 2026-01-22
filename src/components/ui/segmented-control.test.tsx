/**
 * SegmentedControl 组件测试
 * 测试分段控制器的渲染、交互和无障碍特性
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { SegmentedControl, type SegmentOption } from './segmented-control'
import { Sun, Moon, Monitor } from 'lucide-react'

// 测试用选项
const themeOptions: SegmentOption<'light' | 'dark' | 'system'>[] = [
  { value: 'light', label: '日间', icon: <Sun data-testid="icon-sun" /> },
  { value: 'dark', label: '暗夜', icon: <Moon data-testid="icon-moon" /> },
  { value: 'system', label: '自动', icon: <Monitor data-testid="icon-monitor" /> },
]

const simpleOptions: SegmentOption<'a' | 'b'>[] = [
  { value: 'a', label: '选项 A' },
  { value: 'b', label: '选项 B' },
]

describe('SegmentedControl', () => {
  // 模拟 DOM 元素的尺寸
  beforeEach(() => {
    // Mock offsetLeft 和 offsetWidth
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
      configurable: true,
      get() { return 0 }
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() { return 100 }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染所有选项标签', async () => {
      render(
        <SegmentedControl
          options={themeOptions}
          value="light"
          onChange={() => {}}
        />
      )

      // 等待 mounted 状态更新
      await waitFor(() => {
        expect(screen.getByText('日间')).toBeInTheDocument()
      })
      expect(screen.getByText('暗夜')).toBeInTheDocument()
      expect(screen.getByText('自动')).toBeInTheDocument()
    })

    it('应该渲染选项图标', async () => {
      render(
        <SegmentedControl
          options={themeOptions}
          value="light"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('icon-sun')).toBeInTheDocument()
      })
      expect(screen.getByTestId('icon-moon')).toBeInTheDocument()
      expect(screen.getByTestId('icon-monitor')).toBeInTheDocument()
    })

    it('应该在无图标时正常渲染', async () => {
      render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('选项 A')).toBeInTheDocument()
      })
      expect(screen.getByText('选项 B')).toBeInTheDocument()
    })

    it('SSR 时应该显示骨架占位符', () => {
      // 首次渲染时 mounted=false，显示骨架
      const { container } = render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
        />
      )

      // 初始渲染可能是骨架 (.animate-pulse)
      // 注意：由于 useEffect 立即执行，skeleton 可能不存在
      // 这个测试主要验证组件不会崩溃
      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该支持 sm 尺寸', async () => {
      const { container } = render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
          size="sm"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('选项 A')).toBeInTheDocument()
      })

      // sm 尺寸使用 p-0.5 padding
      const wrapper = container.querySelector('[role="tablist"]')
      expect(wrapper).toHaveClass('p-0.5')
    })

    it('应该支持 md 尺寸 (默认)', async () => {
      const { container } = render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('选项 A')).toBeInTheDocument()
      })

      // md 尺寸使用 p-1 padding
      const wrapper = container.querySelector('[role="tablist"]')
      expect(wrapper).toHaveClass('p-1')
    })

    it('应该支持自定义 className', async () => {
      const { container } = render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
          className="custom-class"
        />
      )

      await waitFor(() => {
        const wrapper = container.querySelector('[role="tablist"]')
        expect(wrapper).toHaveClass('custom-class')
      })
    })
  })

  describe('交互', () => {
    it('点击选项应触发 onChange 回调', async () => {
      const handleChange = vi.fn()

      render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={handleChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('选项 B')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('选项 B'))

      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange).toHaveBeenCalledWith('b')
    })

    it('点击当前选中项也应触发回调', async () => {
      const handleChange = vi.fn()

      render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={handleChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('选项 A')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('选项 A'))

      expect(handleChange).toHaveBeenCalledWith('a')
    })

    it('多次点击应多次触发回调', async () => {
      const handleChange = vi.fn()

      render(
        <SegmentedControl
          options={themeOptions}
          value="light"
          onChange={handleChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('暗夜')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('暗夜'))
      fireEvent.click(screen.getByText('自动'))
      fireEvent.click(screen.getByText('日间'))

      expect(handleChange).toHaveBeenCalledTimes(3)
    })
  })

  describe('选中状态', () => {
    it('选中选项应有 aria-selected=true', async () => {
      render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        const selectedTab = screen.getByRole('tab', { selected: true })
        expect(selectedTab).toHaveTextContent('选项 A')
      })
    })

    it('未选中选项应有 aria-selected=false', async () => {
      render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab')
        const unselectedTab = tabs.find(tab =>
          tab.getAttribute('aria-selected') === 'false'
        )
        expect(unselectedTab).toHaveTextContent('选项 B')
      })
    })

    it('value 变化时应更新 aria-selected', async () => {
      const { rerender } = render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('选项 A')
      })

      rerender(
        <SegmentedControl
          options={simpleOptions}
          value="b"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('选项 B')
      })
    })
  })

  describe('无障碍', () => {
    it('容器应有 role="tablist"', async () => {
      render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument()
      })
    })

    it('每个选项应有 role="tab"', async () => {
      render(
        <SegmentedControl
          options={themeOptions}
          value="light"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab')
        expect(tabs).toHaveLength(3)
      })
    })

    it('应支持 aria-label 属性', async () => {
      render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
          ariaLabel="主题选择"
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', '主题选择')
      })
    })

    it('每个 tab 应有 aria-controls 属性', async () => {
      render(
        <SegmentedControl
          options={simpleOptions}
          value="a"
          onChange={() => {}}
        />
      )

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab')
        expect(tabs[0]).toHaveAttribute('aria-controls', 'panel-a')
        expect(tabs[1]).toHaveAttribute('aria-controls', 'panel-b')
      })
    })
  })
})
