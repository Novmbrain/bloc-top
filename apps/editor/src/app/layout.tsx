import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'
import { canAccessEditor } from '@bloctop/shared/permissions'
import '@bloctop/ui/styles/globals.css'
import './globals.css'

// 所有 Editor 页面需要 session 验证，不能静态预渲染
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '寻岩记 · 编辑器',
  description: '岩场管理与数据标记服务',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: await headers() })

  const pwaUrl = process.env.NEXT_PUBLIC_PWA_URL || 'https://bouldering.top'
  const editorUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://editor.bouldering.top'

  if (!session?.user?.id) {
    redirect(`${pwaUrl}/zh/login?callbackURL=${encodeURIComponent(editorUrl)}`)
  }

  const role = (session.user as { role?: string }).role || 'user'
  const hasAccess = await canAccessEditor(session.user.id, role as 'admin' | 'user')
  if (!hasAccess) {
    // 无权限 → 回 PWA 首页（不回 editor，避免循环）
    redirect(pwaUrl)
  }

  return (
    <html lang="zh" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
