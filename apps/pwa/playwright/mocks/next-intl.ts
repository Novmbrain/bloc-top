/**
 * next-intl mock for Playwright Component Testing
 * 返回中文翻译，保持测试用例使用中文文本
 */

const zhTranslations: Record<string, Record<string, string>> = {
  Common: {
    loading: '加载中...',
    error: '出错了',
    retry: '重试',
    back: '返回',
    search: '搜索',
    filter: '筛选',
    all: '全部',
    cancel: '取消',
    confirm: '确认',
    more: '更多',
    close: '关闭',
    clear: '清除',
    refresh: '刷新',
    none: '暂无',
  },
  RouteList: {
    allGrades: '全部难度',
    selectedGrades: '已选 {count} 个难度',
    gradeHint: '点击切换单个难度，拖动选择范围',
  },
}

/**
 * Mock useTranslations hook
 * Returns a function that looks up translations from zhTranslations
 */
export function useTranslations(namespace: string) {
  return function t(key: string, params?: Record<string, string | number>): string {
    const translations = zhTranslations[namespace] || {}
    let text = translations[key] || key

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }

    return text
  }
}

/**
 * Mock useLocale hook
 */
export function useLocale(): string {
  return 'zh'
}

/**
 * Mock useFormatter hook (if needed)
 */
export function useFormatter() {
  return {
    number: (value: number) => String(value),
    dateTime: (date: Date) => date.toLocaleDateString('zh-CN'),
  }
}
