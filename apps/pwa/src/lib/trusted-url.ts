/**
 * 验证 callbackURL 是否为可信域名，防止开放重定向攻击。
 *
 * 可信: 相对路径 (/xxx)、bouldering.top 及子域名、localhost
 */
export function isTrustedCallbackURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  // 相对路径始终可信
  if (url.startsWith('/') && !url.startsWith('//')) return true

  try {
    const parsed = new URL(url)

    // 仅允许 http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

    const hostname = parsed.hostname

    // localhost（开发环境）
    if (hostname === 'localhost') return true

    // bouldering.top 及其子域名
    if (hostname === 'bouldering.top' || hostname.endsWith('.bouldering.top')) return true

    return false
  } catch {
    return false
  }
}
