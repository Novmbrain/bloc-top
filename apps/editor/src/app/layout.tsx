import type { Metadata } from 'next'
import '@bloctop/ui/styles/globals.css'
import './globals.css'

export const metadata: Metadata = {
  title: '寻岩记 · 编辑器',
  description: '岩场管理与数据标记服务',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
