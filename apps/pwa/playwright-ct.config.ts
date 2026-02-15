import { defineConfig, devices } from '@playwright/experimental-ct-react'
import path from 'path'

/**
 * Playwright Component Testing 配置
 * 用于测试需要真实浏览器环境的复杂交互组件
 *
 * @see https://playwright.dev/docs/test-components
 */
export default defineConfig({
  testDir: './src',
  testMatch: '**/*.ct.tsx',

  // 快照目录
  snapshotDir: './__snapshots__',

  // 超时设置
  timeout: 10 * 1000,

  // 完全并行运行测试
  fullyParallel: true,

  // CI 模式下禁止 test.only
  forbidOnly: !!process.env.CI,

  // CI 模式下重试失败的测试
  retries: process.env.CI ? 2 : 0,

  // 并行 worker 数量
  workers: process.env.CI ? 1 : undefined,

  // 测试报告
  reporter: 'html',

  use: {
    // 收集失败测试的 trace
    trace: 'on-first-retry',

    // 慢动作模式：设置 SLOW_MO 环境变量来减慢操作速度（毫秒）
    // 例如: SLOW_MO=500 npm run test:ct:ui
    launchOptions: {
      slowMo: parseInt(process.env.SLOW_MO || '0', 10),
    },

    // 组件测试专用配置
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          // Mock next-intl for component testing (returns Chinese translations)
          'next-intl': path.resolve(__dirname, './playwright/mocks/next-intl.ts'),
        },
      },
    },
  },

  // 只在 Chromium 上运行（加快 CI 速度）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
