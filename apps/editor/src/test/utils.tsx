/**
 * 测试工具函数 (Editor App)
 */
import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { ...options }),
  }
}

export * from '@testing-library/react'
export { userEvent }
export { customRender as render }
