# Testing Conventions - 罗源野抱 TOPO

## 测试框架
- **单元测试**: Vitest + Testing Library
- **组件测试**: Playwright (复杂交互)
- **覆盖率工具**: v8

## 文件命名约定
| 类型 | 命名 | 位置 |
|------|------|------|
| 单元测试 | `*.test.ts` | 与源文件同目录 |
| 组件测试 | `*.test.tsx` | 与组件同目录 |
| 浏览器测试 | `*.ct.tsx` | 与组件同目录 |

## Mock 模式

### 1. 外部库 Mock (pinyin-pro 示例)
```typescript
vi.mock('pinyin-pro', () => ({
  match: vi.fn((text: string, query: string) => {
    const mockMatches: Record<string, Record<string, number[]>> = {
      '年年有鱼': { 'nnyy': [0, 1, 2, 3] },
    }
    return mockMatches[text]?.[query.toLowerCase()] ?? null
  }),
}))
```

### 2. localStorage Mock
```typescript
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
```

### 3. fetch Mock
```typescript
const mockFetch = vi.fn()
global.fetch = mockFetch

mockFetch.mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ cityId: 'luoyuan' }),
})
```

### 4. next-themes Mock
```typescript
const mockSetTheme = vi.fn()
let mockTheme = 'light'

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
    resolvedTheme: mockTheme,
  }),
}))
```

## Hook 测试模式
```typescript
import { renderHook, act, waitFor } from '@testing-library/react'

// 1. 渲染 hook
const { result } = renderHook(() => useCustomHook())

// 2. 等待异步初始化
await waitFor(() => {
  expect(result.current.isLoading).toBe(false)
})

// 3. 调用 hook 方法
act(() => {
  result.current.someAction()
})

// 4. 验证状态变化
expect(result.current.someState).toBe(expectedValue)
```

## 测试场景分类

### 渲染测试
- 检查元素是否存在
- 验证 ARIA 属性
- 检查初始状态

### 交互测试
- 点击、输入事件
- 状态切换
- 回调函数调用

### 边界条件
- 空输入
- 无效数据
- API 失败

### 用户场景
- 完整用户流程模拟
- 真实使用场景还原

## 常用命令
```bash
npm run test          # watch 模式
npm run test:run      # 单次运行
npm run test:coverage # 覆盖率报告
npm run test:ct       # Playwright 组件测试
```

## 覆盖率目标
- **Lib 工具函数**: 90%+
- **核心组件**: 80%+
- **总体**: 50%+ (中期目标)
