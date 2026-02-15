import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

/**
 * 请求级别的国际化配置
 *
 * 这个配置在每个请求时执行，用于：
 * 1. 验证请求的语言是否有效
 * 2. 加载对应的翻译文件
 * 3. 配置时区和格式化选项
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // 获取请求的语言
  const requested = await requestLocale

  // 验证语言是否在支持列表中，否则使用默认语言
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,

    // 动态加载翻译文件
    messages: (await import(`../../messages/${locale}.json`)).default,

    // 时区配置 (中国标准时间)
    timeZone: 'Asia/Shanghai',

    // 缺失翻译的处理
    onError(error) {
      if (error.code === 'MISSING_MESSAGE') {
        // 开发环境警告，生产环境可以上报到日志系统
        console.warn('[i18n] Missing translation:', error.message)
      } else {
        console.error('[i18n] Error:', error)
      }
    },

    // 缺失翻译时的回退显示
    getMessageFallback({ namespace, key }) {
      return `${namespace}.${key}`
    },
  }
})
