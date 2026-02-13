'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Settings, Heart, Copy, Check, User, Send, Users, LogIn, Mountain, Info, ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { AppTabbar } from '@/components/app-tabbar'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { LocaleSegmented } from '@/components/locale-switcher'
import { OfflineCacheSection } from '@/components/offline-cache-manager'
import { SecurityDrawer } from '@/components/security-drawer'
import { Drawer } from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import { ImageViewer } from '@/components/ui/image-viewer'
import { useSession } from '@/lib/auth-client'
import { UserAvatar } from '@/components/user-avatar'

// 访问统计缓存 key
const VISITS_CACHE_KEY = 'total_visits_cache'

// 作者信息常量
const AUTHOR = {
  name: '傅文杰',
  bio: '爱攀岩的程序猿 🧗‍♂️',
  avatarUrl: 'https://img.bouldering.top/avatar.jpg',
  donateUrl: 'https://img.bouldering.top/donate.png',
  wechat: 'Novmbrain',
  xiaohongshu: 'WindOfBretagne',
}

export default function ProfilePage() {
  const t = useTranslations('Profile')
  const tAuth = useTranslations('Auth')
  const tIntro = useTranslations('Intro')

  // Auth state — extract refetch to sync session after avatar upload
  const sessionHook = useSession()
  const session = sessionHook.data
  const isLoggedIn = !!session
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

  // Avatar local state (overrides session until next refresh)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null | undefined>(undefined)
  const avatarUrl = localAvatarUrl !== undefined
    ? localAvatarUrl
    : (session?.user as { image?: string | null } | undefined)?.image ?? null

  // Keep refetch in a ref so the callback stays stable
  const sessionRefetchRef = useRef<((params?: { query?: Record<string, unknown> }) => Promise<void>) | undefined>(undefined)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionRefetchRef.current = (sessionHook as any).refetch

  const handleAvatarChange = useCallback((url: string | null) => {
    setLocalAvatarUrl(url)
    // Force useSession() atom to refetch from DB, bypassing cookie cache
    sessionRefetchRef.current?.({ query: { disableCookieCache: true } })
  }, [])

  // Drawer states
  const [securityDrawerOpen, setSecurityDrawerOpen] = useState(false)
  const [authorDrawerOpen, setAuthorDrawerOpen] = useState(false)

  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImage, setViewerImage] = useState('')
  const [viewerAlt, setViewerAlt] = useState('')

  // Author drawer state
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [avatarLoaded, setAvatarLoaded] = useState(false)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  // Visit stats
  const [totalVisits, setTotalVisits] = useState<number | null>(null)

  useEffect(() => {
    const cached = localStorage.getItem(VISITS_CACHE_KEY)
    if (cached) setTotalVisits(parseInt(cached, 10))

    fetch('/api/visit')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setTotalVisits(data.total)
          localStorage.setItem(VISITS_CACHE_KEY, String(data.total))
        }
      })
      .catch(() => {})
  }, [])

  const openViewer = useCallback((src: string, alt: string) => {
    setViewerImage(src)
    setViewerAlt(alt)
    setViewerOpen(true)
  }, [])

  const submitFeedback = useCallback(async () => {
    if (!feedbackContent.trim() || feedbackSubmitting) return
    setFeedbackSubmitting(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: feedbackContent.trim() }),
      })
      if (response.ok) {
        setFeedbackSubmitted(true)
        setFeedbackContent('')
        setTimeout(() => setFeedbackSubmitted(false), 3000)
      }
    } catch {
      // Silent fail
    } finally {
      setFeedbackSubmitting(false)
    }
  }, [feedbackContent, feedbackSubmitting])

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }, [])

  return (
    <>
      <div
        className="flex flex-col min-h-screen"
        style={{
          backgroundColor: 'var(--theme-surface)',
          transition: 'var(--theme-transition)',
        }}
      >
        {/* Header */}
        <header className="pt-12 px-4 pb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-on-surface)' }}>
            {t('title')}
          </h1>
        </header>

        <main className="flex-1 px-4 pb-24">
          {/* === Profile Hero === */}
          <div className="mb-6">
            {isLoggedIn ? (
              <button
                onClick={() => setSecurityDrawerOpen(true)}
                className="glass w-full flex items-center gap-4 p-4 transition-all active:scale-[0.98]"
                style={{ borderRadius: 'var(--theme-radius-xl)' }}
              >
                <UserAvatar
                  src={avatarUrl}
                  email={session.user.email}
                  size={48}
                />
                <div className="flex-1 text-left">
                  <p className="text-base font-medium" style={{ color: 'var(--theme-on-surface)' }}>
                    {session.user.email}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                    {t('accountSecurityHint')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-on-surface-variant)' }} />
              </button>
            ) : (
              <Link
                href="/login"
                className="glass w-full flex items-center gap-4 p-4 transition-all active:scale-[0.98]"
                style={{ borderRadius: 'var(--theme-radius-xl)' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))' }}
                >
                  <LogIn className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-medium" style={{ color: 'var(--theme-on-surface)' }}>
                    {tAuth('loginOrRegister')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                    {tAuth('firstTimeHint')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-on-surface-variant)' }} />
              </Link>
            )}
          </div>

          {/* === Preferences === */}
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
              {t('preferences')}
            </span>
          </div>
          <div
            className="glass mb-6"
            style={{ borderRadius: 'var(--theme-radius-xl)' }}
          >
            <div className="p-4">
              <ThemeSwitcher />
            </div>
            <div className="mx-4" style={{ borderBottom: '1px solid var(--glass-border)' }} />
            <div className="p-4">
              <LocaleSegmented />
            </div>
          </div>

          {/* === Data & Storage === */}
          <OfflineCacheSection />

          {/* === About === */}
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
              {t('about')}
            </span>
          </div>
          <div
            className="glass mb-6"
            style={{ borderRadius: 'var(--theme-radius-xl)' }}
          >
            {/* App intro */}
            <Link
              href="/intro"
              className="w-full flex items-center gap-4 p-4 transition-all active:scale-[0.98]"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))' }}
              >
                <Mountain className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>
                  {tIntro('profileEntry')}
                </p>
                <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {tIntro('profileEntryHint')}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-on-surface-variant)' }} />
            </Link>

            <div className="mx-4" style={{ borderBottom: '1px solid var(--glass-border)' }} />

            {/* Author */}
            <button
              onClick={() => setAuthorDrawerOpen(true)}
              className="w-full flex items-center gap-4 p-4 transition-all active:scale-[0.98]"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))' }}
              >
                <User className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>
                  {t('author')}
                </p>
                <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {t('authorHint')}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-on-surface-variant)' }} />
            </button>

            <div className="mx-4" style={{ borderBottom: '1px solid var(--glass-border)' }} />

            {/* Visit stats */}
            <div className="flex items-center gap-4 p-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--theme-success) 15%, var(--theme-surface))' }}
              >
                <Users className="w-5 h-5" style={{ color: 'var(--theme-success)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {t('totalVisits')}
                </p>
              </div>
              <div className="text-right">
                {totalVisits !== null ? (
                  <p className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>
                    {totalVisits.toLocaleString()}
                    <span className="text-xs font-normal ml-1" style={{ color: 'var(--theme-on-surface-variant)' }}>{t('visits')}</span>
                  </p>
                ) : (
                  <span
                    className="inline-block w-12 h-5 rounded skeleton-shimmer"
                    style={{ backgroundColor: 'var(--theme-surface-variant)' }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Version */}
          <div className="mt-4 text-center">
            <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('version')}
            </p>
          </div>
        </main>

        <AppTabbar />
      </div>

      {/* Security Drawer */}
      {isLoggedIn && session && (
        <SecurityDrawer
          isOpen={securityDrawerOpen}
          onClose={() => setSecurityDrawerOpen(false)}
          session={{
            user: {
              email: session.user.email,
              role: (session.user as { role?: string }).role,
              image: avatarUrl,
            },
          }}
          isAdmin={isAdmin}
          onAvatarChange={handleAvatarChange}
        />
      )}

      {/* Author Drawer */}
      <Drawer
        isOpen={authorDrawerOpen}
        onClose={() => setAuthorDrawerOpen(false)}
        height="auto"
        showHandle
      >
        <div className="px-4 pb-6">
          {/* Author avatar & info */}
          <div className="flex flex-col items-center mb-6">
            <button
              onClick={() => openViewer(AUTHOR.avatarUrl, t('avatarAlt'))}
              className="relative w-24 h-24 rounded-2xl overflow-hidden mb-4 transition-transform active:scale-95"
              style={{ boxShadow: 'var(--theme-shadow-md)' }}
            >
              {!avatarLoaded && (
                <div className="absolute inset-0 skeleton-shimmer" />
              )}
              <Image
                src={AUTHOR.avatarUrl}
                alt={t('avatarAlt')}
                fill
                className={`object-cover transition-opacity duration-300 ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setAvatarLoaded(true)}
                sizes="96px"
              />
            </button>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--theme-on-surface)' }}>
              {AUTHOR.name}
            </h2>
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {AUTHOR.bio}
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-3 mb-4">
            <button
              onClick={() => copyToClipboard(AUTHOR.wechat, 'wechat')}
              className="glass-light w-full flex items-center gap-3 p-3 transition-all active:scale-[0.98]"
              style={{ borderRadius: 'var(--theme-radius-lg)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#07c160' }}
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.11.24-.245 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>
                  {t('wechat')}
                </p>
                <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {AUTHOR.wechat}
                </p>
              </div>
              {copiedField === 'wechat' ? (
                <Check className="w-5 h-5" style={{ color: 'var(--theme-success)' }} />
              ) : (
                <Copy className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
              )}
            </button>

            <button
              onClick={() => copyToClipboard(AUTHOR.xiaohongshu, 'xiaohongshu')}
              className="glass-light w-full flex items-center gap-3 p-3 transition-all active:scale-[0.98]"
              style={{ borderRadius: 'var(--theme-radius-lg)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FF2442' }}
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>
                  {t('xiaohongshu')}
                </p>
                <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {AUTHOR.xiaohongshu}
                </p>
              </div>
              {copiedField === 'xiaohongshu' ? (
                <Check className="w-5 h-5" style={{ color: 'var(--theme-success)' }} />
              ) : (
                <Copy className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
              )}
            </button>
          </div>

          {/* Feedback */}
          <div className="mb-4">
            <div className="relative">
              <Textarea
                value={feedbackContent}
                onChange={(value) => setFeedbackContent(value)}
                placeholder={t('feedbackPlaceholder')}
                maxLength={500}
                rows={3}
                className="p-3 pr-12"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-lg)',
                }}
              />
              <button
                onClick={submitFeedback}
                disabled={!feedbackContent.trim() || feedbackSubmitting}
                className="absolute right-2 bottom-2 p-2 transition-all disabled:opacity-40"
                style={{
                  color: feedbackSubmitted ? 'var(--theme-success)' : 'var(--theme-primary)',
                }}
              >
                {feedbackSubmitted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            {feedbackSubmitted && (
              <p className="text-xs mt-1 text-center" style={{ color: 'var(--theme-success)' }}>
                {t('feedbackThanks')}
              </p>
            )}
          </div>

          {/* Donate */}
          <button
            onClick={() => openViewer(AUTHOR.donateUrl, t('donateAlt'))}
            className="w-full flex items-center justify-center gap-2 p-4 transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
              borderRadius: 'var(--theme-radius-xl)',
              color: 'white',
              boxShadow: '0 4px 15px rgba(238, 90, 90, 0.3)',
            }}
          >
            <Heart className="w-5 h-5" fill="white" />
            <span className="font-medium">{t('donate')}</span>
          </button>
        </div>
      </Drawer>

      {/* Image Viewer */}
      <ImageViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        src={viewerImage}
        alt={viewerAlt}
      />
    </>
  )
}
