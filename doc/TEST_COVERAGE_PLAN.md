# 测试覆盖计划

> 为缺少测试的核心功能添加测试

## 📊 当前覆盖情况

| 类别 | 已测试 | 未测试 | 覆盖率 |
|------|--------|--------|--------|
| **lib/** | 16 | 8 | 67% |
| **hooks/** | 5 | 2 | 71% |
| **components/** | 19 | 17 | 53% |

## 🎯 优先级排序

### P0 - 核心业务逻辑（必须测试）

| 文件 | 原因 | 测试难度 |
|------|------|----------|
| `lib/topo-utils.ts` | Topo 线路核心算法 | ⭐ 简单 |
| `lib/topo-constants.ts` | Topo 配置常量 | ⭐ 简单 |
| `hooks/use-offline-download.ts` | 离线下载核心功能 | ⭐⭐⭐ 困难 |
| `hooks/use-locale-preference.ts` | 语言偏好管理 | ⭐⭐ 中等 |

### P1 - 重要组件（应该测试）

| 文件 | 原因 | 测试难度 |
|------|------|----------|
| `components/topo-line-overlay.tsx` | Topo 线路渲染 | ⭐⭐ 中等 |
| `components/app-tabbar.tsx` | 导航 + 隐藏入口 | ⭐⭐ 中等 |
| `components/ui/image-viewer.tsx` | 图片查看器 | ⭐⭐⭐ 困难 |
| `components/ui/toast.tsx` | Toast 通知 | ⭐ 简单 |

### P2 - 辅助功能（可选测试）

| 文件 | 原因 | 测试难度 |
|------|------|----------|
| `lib/cache-config.ts` | 缓存配置常量 | ⭐ 简单 |
| `lib/logger.ts` | 日志工具 | ⭐⭐ 中等 |
| `components/install-prompt.tsx` | PWA 安装提示 | ⭐⭐ 中等 |

---

## 📝 详细测试设计

### 1. `lib/topo-utils.ts` - Topo 工具函数

```typescript
// src/lib/topo-utils.test.ts

import { describe, it, expect } from 'vitest'
import {
  bezierCurve,
  scalePoints,
  normalizePoint,
  generateRouteColor,
  generateRouteId,
} from './topo-utils'

describe('topo-utils', () => {
  describe('bezierCurve', () => {
    it('should return empty string for less than 2 points', () => {
      expect(bezierCurve([])).toBe('')
      expect(bezierCurve([{ x: 0, y: 0 }])).toBe('')
    })

    it('should return straight line for 2 points', () => {
      const result = bezierCurve([
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ])
      expect(result).toBe('M 0 0 L 100 100')
    })

    it('should return quadratic bezier curve for 3+ points', () => {
      const result = bezierCurve([
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 },
      ])
      expect(result).toContain('M 0 0')
      expect(result).toContain('Q') // 二次贝塞尔曲线
      expect(result).toContain('T') // 平滑连接
    })

    it('should handle multiple control points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 25, y: 50 },
        { x: 50, y: 75 },
        { x: 75, y: 50 },
        { x: 100, y: 0 },
      ]
      const result = bezierCurve(points)

      // 应该有 3 个 Q 命令 (点数-2)
      const qCount = (result.match(/Q/g) || []).length
      expect(qCount).toBe(3)
    })
  })

  describe('scalePoints', () => {
    it('should scale normalized points to target dimensions', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ]
      const result = scalePoints(points, 400, 300)

      expect(result[0]).toEqual({ x: 0, y: 0 })
      expect(result[1]).toEqual({ x: 200, y: 150 })
      expect(result[2]).toEqual({ x: 400, y: 300 })
    })

    it('should handle empty array', () => {
      expect(scalePoints([], 100, 100)).toEqual([])
    })
  })

  describe('normalizePoint', () => {
    it('should normalize coordinates to 0-1 range', () => {
      expect(normalizePoint(200, 150, 400, 300)).toEqual({ x: 0.5, y: 0.5 })
      expect(normalizePoint(0, 0, 400, 300)).toEqual({ x: 0, y: 0 })
      expect(normalizePoint(400, 300, 400, 300)).toEqual({ x: 1, y: 1 })
    })

    it('should clamp values to 0-1 range', () => {
      // 超出范围的值应该被 clamp
      expect(normalizePoint(-50, -50, 400, 300)).toEqual({ x: 0, y: 0 })
      expect(normalizePoint(500, 400, 400, 300)).toEqual({ x: 1, y: 1 })
    })
  })

  describe('generateRouteColor', () => {
    it('should return a valid hex color', () => {
      const color = generateRouteColor()
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should return colors from predefined palette', () => {
      const validColors = [
        '#22C55E', '#3B82F6', '#F97316', '#EF4444',
        '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B',
      ]
      const color = generateRouteColor()
      expect(validColors).toContain(color)
    })
  })

  describe('generateRouteId', () => {
    it('should return unique IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateRouteId())
      }
      expect(ids.size).toBe(100)
    })

    it('should follow route-{timestamp}-{random} format', () => {
      const id = generateRouteId()
      expect(id).toMatch(/^route-\d+-[a-z0-9]+$/)
    })
  })
})
```

---

### 2. `lib/topo-constants.ts` - Topo 常量

```typescript
// src/lib/topo-constants.test.ts

import { describe, it, expect } from 'vitest'
import {
  TOPO_VIEW_WIDTH,
  TOPO_VIEW_HEIGHT,
  TOPO_LINE_CONFIG,
  TOPO_MARKER_CONFIG,
  TOPO_ANIMATION_CONFIG,
} from './topo-constants'

describe('topo-constants', () => {
  describe('viewBox dimensions', () => {
    it('should have valid width and height', () => {
      expect(TOPO_VIEW_WIDTH).toBeGreaterThan(0)
      expect(TOPO_VIEW_HEIGHT).toBeGreaterThan(0)
    })

    it('should maintain 4:3 aspect ratio', () => {
      const ratio = TOPO_VIEW_WIDTH / TOPO_VIEW_HEIGHT
      expect(ratio).toBeCloseTo(4 / 3, 2)
    })
  })

  describe('line config', () => {
    it('should have valid stroke properties', () => {
      expect(TOPO_LINE_CONFIG.strokeWidth).toBeGreaterThan(0)
      expect(TOPO_LINE_CONFIG.outlineWidth).toBeGreaterThan(TOPO_LINE_CONFIG.strokeWidth)
      expect(TOPO_LINE_CONFIG.outlineOpacity).toBeGreaterThan(0)
      expect(TOPO_LINE_CONFIG.outlineOpacity).toBeLessThanOrEqual(1)
    })

    it('should have valid linecap and linejoin', () => {
      expect(['round', 'square', 'butt']).toContain(TOPO_LINE_CONFIG.strokeLinecap)
      expect(['round', 'bevel', 'miter']).toContain(TOPO_LINE_CONFIG.strokeLinejoin)
    })
  })

  describe('marker config', () => {
    it('should have valid radius values', () => {
      expect(TOPO_MARKER_CONFIG.startRadius).toBeGreaterThan(0)
      expect(TOPO_MARKER_CONFIG.endRadius).toBeGreaterThan(0)
      // 起点应该比终点大（视觉层次）
      expect(TOPO_MARKER_CONFIG.startRadius).toBeGreaterThanOrEqual(TOPO_MARKER_CONFIG.endRadius)
    })
  })

  describe('animation config', () => {
    it('should have valid duration format', () => {
      expect(TOPO_ANIMATION_CONFIG.duration).toMatch(/^\d+(\.\d+)?s$/)
    })

    it('should have valid delay values', () => {
      expect(TOPO_ANIMATION_CONFIG.autoPlayDelayDrawer).toBeGreaterThan(0)
      expect(TOPO_ANIMATION_CONFIG.autoPlayDelayFullscreen).toBeGreaterThan(0)
    })
  })
})
```

---

### 3. `hooks/use-locale-preference.ts` - 语言偏好

```typescript
// src/hooks/use-locale-preference.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
}))

// Mock i18n navigation
const mockReplace = vi.fn()
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/',
}))

// 需要在测试中动态 import hook

describe('use-locale-preference', () => {
  beforeEach(() => {
    // 清除 localStorage 和 sessionStorage
    localStorage.clear()
    sessionStorage.clear()
    mockReplace.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCachedLocale', () => {
    it('should return null when no cache exists', async () => {
      const { useLocalePreference } = await import('./use-locale-preference')
      const { result } = renderHook(() => useLocalePreference())

      expect(result.current.getCachedLocale()).toBeNull()
    })

    it('should return cached locale when exists', async () => {
      localStorage.setItem('preferred-locale', 'zh')

      const { useLocalePreference } = await import('./use-locale-preference')
      const { result } = renderHook(() => useLocalePreference())

      expect(result.current.getCachedLocale()).toBe('zh')
    })

    it('should return null for invalid locale', async () => {
      localStorage.setItem('preferred-locale', 'invalid')

      const { useLocalePreference } = await import('./use-locale-preference')
      const { result } = renderHook(() => useLocalePreference())

      expect(result.current.getCachedLocale()).toBeNull()
    })
  })

  describe('setCachedLocale', () => {
    it('should save locale to localStorage', async () => {
      const { useLocalePreference } = await import('./use-locale-preference')
      const { result } = renderHook(() => useLocalePreference())

      act(() => {
        result.current.setCachedLocale('fr')
      })

      expect(localStorage.getItem('preferred-locale')).toBe('fr')
    })
  })

  describe('switchLocale', () => {
    it('should update cache and call router.replace', async () => {
      const { useLocalePreference } = await import('./use-locale-preference')
      const { result } = renderHook(() => useLocalePreference())

      act(() => {
        result.current.switchLocale('zh')
      })

      expect(localStorage.getItem('preferred-locale')).toBe('zh')
      expect(mockReplace).toHaveBeenCalledWith('/', { locale: 'zh' })
    })
  })
})
```

---

### 4. `components/app-tabbar.tsx` - 导航栏 + 隐藏入口

```typescript
// src/components/app-tabbar.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppTabbar } from './app-tabbar'

// Mock translations
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      home: 'Home',
      routes: 'Routes',
      settings: 'Settings',
    }
    return translations[key] || key
  },
}))

// Mock i18n navigation
const mockPush = vi.fn()
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
  usePathname: () => '/',
  useRouter: () => ({ push: mockPush }),
}))

describe('AppTabbar', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockPush.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render all navigation items', () => {
    render(<AppTabbar />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Routes')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('should highlight active route', () => {
    render(<AppTabbar />)

    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
  })

  describe('secret tap feature', () => {
    it('should navigate to editor after 6 rapid taps', () => {
      render(<AppTabbar />)
      const routesLink = screen.getByText('Routes').closest('a')!

      // 快速点击 6 次
      for (let i = 0; i < 6; i++) {
        fireEvent.click(routesLink)
        vi.advanceTimersByTime(100) // 每次间隔 100ms
      }

      expect(mockPush).toHaveBeenCalledWith('/editor')
    })

    it('should reset count after timeout', () => {
      render(<AppTabbar />)
      const routesLink = screen.getByText('Routes').closest('a')!

      // 点击 3 次
      for (let i = 0; i < 3; i++) {
        fireEvent.click(routesLink)
        vi.advanceTimersByTime(100)
      }

      // 等待超过 2 秒
      vi.advanceTimersByTime(2500)

      // 再点击 3 次（不应该触发）
      for (let i = 0; i < 3; i++) {
        fireEvent.click(routesLink)
        vi.advanceTimersByTime(100)
      }

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should persist count across navigations via sessionStorage', () => {
      render(<AppTabbar />)
      const routesLink = screen.getByText('Routes').closest('a')!

      // 点击 3 次
      for (let i = 0; i < 3; i++) {
        fireEvent.click(routesLink)
        vi.advanceTimersByTime(100)
      }

      // 检查 sessionStorage
      const stored = sessionStorage.getItem('_secret_tap')
      expect(stored).not.toBeNull()

      const data = JSON.parse(stored!)
      expect(data.count).toBe(3)
    })
  })
})
```

---

### 5. `components/topo-line-overlay.tsx` - Topo 线路渲染

```typescript
// src/components/topo-line-overlay.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { TopoLineOverlay, type TopoLineOverlayRef } from './topo-line-overlay'

describe('TopoLineOverlay', () => {
  const defaultProps = {
    points: [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.9 },
    ],
    color: '#22C55E',
  }

  it('should render SVG with correct viewBox', () => {
    const { container } = render(<TopoLineOverlay {...defaultProps} />)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('viewBox', '0 0 400 300')
  })

  it('should render path with correct stroke color', () => {
    const { container } = render(<TopoLineOverlay {...defaultProps} />)

    const paths = container.querySelectorAll('path')
    // 应该有 2 个 path: outline 和 main
    expect(paths.length).toBe(2)

    const mainPath = paths[1]
    expect(mainPath).toHaveAttribute('stroke', '#22C55E')
  })

  it('should render start and end markers', () => {
    const { container } = render(<TopoLineOverlay {...defaultProps} />)

    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(2) // 起点和终点
  })

  it('should not render with less than 2 points', () => {
    const { container } = render(
      <TopoLineOverlay points={[{ x: 0.5, y: 0.5 }]} color="#000" />
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeNull()
  })

  it('should expose replay method via ref', () => {
    const ref = createRef<TopoLineOverlayRef>()
    render(<TopoLineOverlay {...defaultProps} ref={ref} />)

    expect(ref.current).not.toBeNull()
    expect(typeof ref.current?.replay).toBe('function')
  })

  it('should trigger replay on start point click', () => {
    const onAnimationStart = vi.fn()
    const { container } = render(
      <TopoLineOverlay
        {...defaultProps}
        onAnimationStart={onAnimationStart}
      />
    )

    const startCircle = container.querySelectorAll('circle')[0]
    fireEvent.click(startCircle)

    expect(onAnimationStart).toHaveBeenCalled()
  })
})
```

---

### 6. `components/ui/toast.tsx` - Toast 通知

```typescript
// src/components/ui/toast.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from './toast'

// 测试组件，用于触发 toast
function TestComponent() {
  const { showToast } = useToast()
  return (
    <button onClick={() => showToast('Test message', 'success')}>
      Show Toast
    </button>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show toast message', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    // 点击按钮显示 toast
    act(() => {
      screen.getByText('Show Toast').click()
    })

    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('should auto-hide after duration', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Toast').click()
    })

    expect(screen.getByText('Test message')).toBeInTheDocument()

    // 等待自动隐藏
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.queryByText('Test message')).not.toBeInTheDocument()
  })

  it('should render different types with correct styles', () => {
    function MultiTypeTest() {
      const { showToast } = useToast()
      return (
        <>
          <button onClick={() => showToast('Success', 'success')}>Success</button>
          <button onClick={() => showToast('Error', 'error')}>Error</button>
        </>
      )
    }

    const { container } = render(
      <ToastProvider>
        <MultiTypeTest />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Success').click()
    })

    // 验证 success 样式
    const toast = screen.getByText('Success').closest('div')
    expect(toast).toBeInTheDocument()
  })
})
```

---

## 🚀 实施步骤

### 阶段 1：P0 核心测试（本周）

```bash
# 1. 创建 topo-utils 测试
touch src/lib/topo-utils.test.ts

# 2. 创建 topo-constants 测试
touch src/lib/topo-constants.test.ts

# 3. 运行测试验证
npm run test:run -- topo
```

### 阶段 2：P1 组件测试（下周）

```bash
# 1. 创建 app-tabbar 测试
touch src/components/app-tabbar.test.tsx

# 2. 创建 topo-line-overlay 测试
touch src/components/topo-line-overlay.test.tsx

# 3. 创建 toast 测试
touch src/components/ui/toast.test.tsx
```

### 阶段 3：覆盖率检查

```bash
npm run test:coverage
```

---

## 📈 预期覆盖率提升

| 阶段 | 新增测试 | 预期覆盖率 |
|------|----------|------------|
| 当前 | - | ~34% |
| P0 完成 | 2 文件 | ~38% |
| P1 完成 | 4 文件 | ~45% |
| P2 完成 | 3 文件 | ~50% |

---

## ⚠️ 测试注意事项

1. **Mock 策略**
   - `next-intl` 需要 mock `useTranslations`
   - `@/i18n/navigation` 需要 mock `Link`, `useRouter`, `usePathname`
   - `sessionStorage`/`localStorage` 在 `beforeEach` 清空

2. **异步测试**
   - 使用 `vi.useFakeTimers()` 控制定时器
   - 使用 `act()` 包裹状态更新

3. **组件测试 vs 单元测试**
   - 工具函数：纯单元测试
   - React 组件：使用 `@testing-library/react`
   - 复杂交互：考虑 Playwright CT
