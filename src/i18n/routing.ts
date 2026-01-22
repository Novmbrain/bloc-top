import { defineRouting } from 'next-intl/routing'

/**
 * 国际化路由配置
 *
 * 定义支持的语言列表和默认语言
 * 这个配置会被 middleware 和 navigation 使用
 */
export const routing = defineRouting({
  // 支持的语言列表
  locales: ['zh', 'en'],

  // 默认语言 (中文)
  defaultLocale: 'zh',

  // 语言前缀策略
  // 'always': 所有语言都显示前缀 (/zh/..., /en/...)
  // 'as-needed': 默认语言不显示前缀 (/, /en/...)
  localePrefix: 'always',
})

// 导出语言类型，用于类型安全
export type Locale = (typeof routing.locales)[number]
