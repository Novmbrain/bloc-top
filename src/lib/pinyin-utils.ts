import { match } from 'pinyin-pro'

/**
 * 检测查询字符串是否包含中文字符
 */
export function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str)
}

/**
 * 检测查询字符串是否为纯拼音（字母）
 */
export function isPinyin(str: string): boolean {
  return /^[a-zA-Z]+$/.test(str)
}

/**
 * 使用拼音匹配文本
 * @param text 要匹配的中文文本
 * @param query 查询字符串（拼音或中文）
 * @returns 匹配的字符索引数组，未匹配返回 null
 */
export function matchPinyin(text: string, query: string): number[] | null {
  if (!text || !query) return null
  
  // 如果查询包含中文，使用原生匹配而非拼音
  if (containsChinese(query)) {
    return null
  }
  
  // 使用 pinyin-pro 的 match 函数
  // 支持全拼、首字母、混合匹配
  return match(text, query)
}

/**
 * 获取拼音匹配的首个匹配位置
 * 用于排序优先级
 */
export function getPinyinMatchPosition(text: string, query: string): number {
  const matches = matchPinyin(text, query)
  if (!matches || matches.length === 0) return -1
  return matches[0]
}
