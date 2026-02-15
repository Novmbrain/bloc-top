/**
 * 测试工具函数
 * 提供组件测试的渲染包装器和常用工具
 */
import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * 自定义渲染函数
 * 可以包装 Provider（如 ThemeProvider）如果需要
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { ...options }),
  }
}

// 导出所有 testing-library 的工具
export * from '@testing-library/react'
export { userEvent }

// 用自定义 render 替换默认的
export { customRender as render }

/**
 * 创建 mock 的触摸事件
 * 用于测试拖动交互
 */
export function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientX: number,
  clientY = 0
): React.TouchEvent {
  return {
    touches: [{ clientX, clientY }],
    changedTouches: [{ clientX, clientY }],
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as React.TouchEvent
}

/**
 * 创建 mock 的鼠标事件
 * 用于测试拖动交互
 */
export function createMouseEvent(
  clientX: number,
  clientY = 0
): Partial<React.MouseEvent> {
  return {
    clientX,
    clientY,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
}

/**
 * 等待指定时间
 * 用于测试异步行为
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mock 路由 hook 返回值
 */
export function mockSearchParams(params: Record<string, string>) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value)
  })
  return searchParams
}
