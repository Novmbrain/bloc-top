/**
 * Vitest 测试环境配置
 * 为 React 组件测试提供必要的 DOM 环境和全局配置
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Node 22+ 内置了空壳 localStorage/sessionStorage 全局对象，
// 覆盖了 jsdom 提供的完整实现，导致 clear()/getItem() 等方法缺失。
// 这里用标准 Storage API 显式替换。
function createStorageMock(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}
vi.stubGlobal('localStorage', createStorageMock())
vi.stubGlobal('sessionStorage', createStorageMock())

// 每个测试后自动清理 DOM
afterEach(() => {
  cleanup()
})

// Mock next/navigation (组件测试中常用)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock next/image (避免图片加载问题)
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock IntersectionObserver (用于懒加载组件)
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

// Mock ResizeObserver (用于响应式组件)
class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}
vi.stubGlobal('ResizeObserver', MockResizeObserver)

// Mock matchMedia (用于响应式媒体查询)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock next-intl (国际化)
// 使用稳定的函数引用，避免因每次渲染返回新函数导致的无限循环
const stableTranslationFn = Object.assign(
  (key: string, params?: Record<string, unknown>) => {
    if (params) {
      // 简单的参数替换
      let result = key
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v))
      })
      return result
    }
    return key
  },
  { has: () => false }
)

vi.mock('next-intl', () => ({
  useTranslations: () => stableTranslationFn,
  useLocale: () => 'zh',
}))

// Mock @/i18n/navigation (国际化导航)
// 这是项目中使用的国际化导航封装
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  getPathname: vi.fn(),
}))
