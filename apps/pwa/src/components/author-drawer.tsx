'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Copy, Check, Heart, Send } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import { ImageViewer } from '@/components/ui/image-viewer'

// 作者信息常量
const AUTHOR = {
  name: '傅文杰',
  bio: '爱攀岩的程序猿 🧗‍♂️',
  avatarUrl: 'https://img.bouldering.top/avatar.jpg',
  donateUrl: 'https://img.bouldering.top/donate.png',
  wechat: 'Novmbrain',
  xiaohongshu: 'WindOfBretagne',
}

interface AuthorDrawerProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 作者信息抽屉 — 联系方式、反馈留言、捐赠入口
 *
 * 从 profile/page.tsx 提取的独立组件，拥有自己的状态管理：
 * - 剪贴板复制反馈
 * - 头像加载状态
 * - 反馈表单提交流程
 * - 全屏图片查看器
 */
export function AuthorDrawer({ isOpen, onClose }: AuthorDrawerProps) {
  const t = useTranslations('Profile')

  // Copy feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null)
  // Avatar loading
  const [avatarLoaded, setAvatarLoaded] = useState(false)
  // Feedback form
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  // Image viewer
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImage, setViewerImage] = useState('')
  const [viewerAlt, setViewerAlt] = useState('')

  const openViewer = useCallback((src: string, alt: string) => {
    setViewerImage(src)
    setViewerAlt(alt)
    setViewerOpen(true)
  }, [])

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

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
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
