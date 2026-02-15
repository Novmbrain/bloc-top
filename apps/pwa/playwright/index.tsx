/**
 * Playwright Component Testing 入口
 * 用于挂载 React 组件到测试环境
 *
 * Note: next-intl is mocked via Vite alias in playwright-ct.config.ts
 * The mock returns Chinese translations to keep tests using Chinese text
 */
import '../src/app/globals.css'
