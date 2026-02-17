import type { Metadata } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { OfflineDownloadProvider } from '@/components/offline-download-provider'
import { FaceImageProvider } from '@/components/face-image-provider'
import OfflineIndicator from '@/components/offline-indicator'
import { MaintenanceBanner } from '@/components/maintenance-banner'
import SWUpdatePrompt from '@/components/sw-update-prompt'
import { LocaleDetector } from '@/components/locale-detector'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * 生成静态参数 - 用于 SSG
 * 为每个支持的语言生成静态页面
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/**
 * 生成语言相关的 metadata
 * 包含 hreflang 备用链接，用于 SEO
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })

  // 构建备用语言链接
  const languages: Record<string, string> = {}
  for (const loc of routing.locales) {
    languages[loc] = `/${loc}`
  }
  // x-default 指向默认语言
  languages['x-default'] = `/${routing.defaultLocale}`

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      languages,
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      alternateLocale: locale === 'zh' ? ['en_US'] : ['zh_CN'],
    },
  }
}

/**
 * 国际化布局组件
 *
 * 处理：
 * 1. 语言验证
 * 2. 静态渲染配置
 * 3. 翻译消息提供
 * 4. 主题和 PWA 组件包装
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // 验证语言是否在支持列表中
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // 启用静态渲染 - 关键性能优化
  setRequestLocale(locale)

  // 获取翻译消息
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider>
        <ToastProvider>
          <OfflineDownloadProvider>
          <FaceImageProvider>
          {/* 桌面端外层背景 - 移动端不可见 */}
          <div
            className="min-h-screen"
            style={{ backgroundColor: 'var(--theme-desktop-bg)' }}
          >
            {/* 居中容器 - 移动端全宽，桌面端固定宽度居中 + 阴影 */}
            <div
              id="app-shell"
              className="relative mx-auto w-full h-dvh overflow-hidden md:shadow-2xl"
              style={{
                maxWidth: 'var(--app-shell-width)',
                backgroundColor: 'var(--theme-surface)',
              }}
            >
              <LocaleDetector />
              <MaintenanceBanner />
              <OfflineIndicator />
              {children}
              <SWUpdatePrompt />
            </div>
          </div>
          </FaceImageProvider>
          </OfflineDownloadProvider>
        </ToastProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
