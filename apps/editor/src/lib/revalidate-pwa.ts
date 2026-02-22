const PWA_URL = process.env.NEXT_PUBLIC_PWA_URL  // https://bouldering.top
const SECRET = process.env.REVALIDATE_SECRET     // 与 PWA 共享的密钥

const LOCALES = ['zh', 'en', 'fr'] as const

/**
 * 通过 webhook 通知 PWA 重验证指定页面
 *
 * Editor 是独立 app，无法直接调用 PWA 的 revalidatePath()。
 * 通过 HTTP POST 到 PWA 的 /api/revalidate 端点实现跨应用缓存失效。
 * 失败不阻塞 editor 操作 — ISR 超时是安全网。
 */
export async function revalidatePwa(options: {
  paths?: string[]
  tags?: string[]
}) {
  if (!PWA_URL || !SECRET) {
    console.warn('[revalidate-pwa] Missing NEXT_PUBLIC_PWA_URL or REVALIDATE_SECRET')
    return
  }

  // 为每个路径生成所有 locale 版本
  const localizedPaths = options.paths?.flatMap(p =>
    LOCALES.map(locale => `/${locale}${p}`)
  ) ?? []

  try {
    const res = await fetch(`${PWA_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`,
      },
      body: JSON.stringify({
        paths: localizedPaths,
        tags: options.tags,
      }),
    })

    if (!res.ok) {
      console.error(`[revalidate-pwa] Failed: ${res.status}`)
    }
  } catch (error) {
    console.error('[revalidate-pwa] Webhook failed:', error)
  }
}

/** 重验证岩场相关页面 + 线路列表页 */
export async function revalidateCragPages(cragId: string) {
  await revalidatePwa({
    paths: [`/crag/${cragId}`, '/', '/route'],
  })
}

/** 重验证首页 */
export async function revalidateHomePage() {
  await revalidatePwa({ paths: ['/'] })
}
