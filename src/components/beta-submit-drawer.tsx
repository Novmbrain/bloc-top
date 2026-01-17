'use client'

import { useState, useCallback } from 'react'
import { Link2, Ruler, ArrowUpFromLine, Check, AlertCircle } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { detectPlatformFromUrl, isXiaohongshuUrl, BETA_PLATFORMS } from '@/lib/beta-constants'

interface BetaSubmitDrawerProps {
  isOpen: boolean
  onClose: () => void
  routeId: number
  routeName: string
  onSuccess?: () => void
}

export function BetaSubmitDrawer({
  isOpen,
  onClose,
  routeId,
  routeName,
  onSuccess,
}: BetaSubmitDrawerProps) {
  const [url, setUrl] = useState('')
  const [height, setHeight] = useState('')
  const [reach, setReach] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 检测平台
  const detectedPlatform = url ? detectPlatformFromUrl(url) : null
  const platformInfo = detectedPlatform ? BETA_PLATFORMS[detectedPlatform] : null

  // 验证 URL
  const isValidUrl = useCallback((input: string) => {
    if (!input.trim()) return false
    try {
      new URL(input)
      return true
    } catch {
      // 尝试添加 https:// 前缀
      try {
        new URL(`https://${input}`)
        return true
      } catch {
        return false
      }
    }
  }, [])

  // 重置表单
  const resetForm = useCallback(() => {
    setUrl('')
    setHeight('')
    setReach('')
    setError(null)
    setSuccess(false)
  }, [])

  // 关闭抽屉
  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  // 提交表单
  const handleSubmit = async () => {
    if (!isValidUrl(url)) {
      setError('请输入有效的链接地址')
      return
    }

    // 验证是否为小红书链接
    if (!isXiaohongshuUrl(url)) {
      setError('目前仅支持小红书链接')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId,
          url: url.startsWith('http') ? url : `https://${url}`,
          climberHeight: height ? parseInt(height, 10) : undefined,
          climberReach: reach ? parseInt(reach, 10) : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '提交失败')
      }

      setSuccess(true)
      setTimeout(() => {
        handleClose()
        onSuccess?.()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      height="half"
      title={`分享 ${routeName} 的 Beta`}
      showCloseButton
    >
      <div className="px-4 pb-4 space-y-4">
        {/* 成功提示 */}
        {success && (
          <div
            className="flex items-center gap-3 p-4 animate-fade-in-up"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-success) 15%, var(--theme-surface))',
              borderRadius: 'var(--theme-radius-xl)',
              border: '1px solid var(--theme-success)',
            }}
          >
            <Check className="w-5 h-5" style={{ color: 'var(--theme-success)' }} />
            <span style={{ color: 'var(--theme-success)' }}>Beta 分享成功！</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div
            className="flex items-center gap-3 p-4 animate-fade-in-up"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-error) 15%, var(--theme-surface))',
              borderRadius: 'var(--theme-radius-xl)',
              border: '1px solid var(--theme-error)',
            }}
          >
            <AlertCircle className="w-5 h-5" style={{ color: 'var(--theme-error)' }} />
            <span style={{ color: 'var(--theme-error)' }}>{error}</span>
          </div>
        )}

        {/* 链接输入 */}
        <div>
          <label
            className="text-sm font-medium mb-2 block"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            视频链接 <span style={{ color: 'var(--theme-error)' }}>*</span>
          </label>
          <div className="relative">
            <Link2
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴小红书视频链接..."
              className="w-full pl-10 pr-4 py-3 text-sm outline-none"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                borderRadius: 'var(--theme-radius-lg)',
                color: 'var(--theme-on-surface)',
              }}
              disabled={isSubmitting || success}
            />
          </div>
          {/* 平台检测提示 */}
          {platformInfo && (
            <div
              className="flex items-center gap-2 mt-2 text-xs"
              style={{ color: platformInfo.color }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: platformInfo.color }}
              />
              已识别为 {platformInfo.name} 链接
            </div>
          )}
        </div>

        {/* 身体数据（可选） */}
        <div>
          <label
            className="text-sm font-medium mb-2 block"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            身体数据 <span className="text-xs font-normal" style={{ color: 'var(--theme-on-surface-variant)' }}>(选填)</span>
          </label>
          <div className="flex gap-3">
            {/* 身高 */}
            <div className="flex-1 relative">
              <Ruler
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              />
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="身高"
                className="w-full pl-9 pr-10 py-3 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-lg)',
                  color: 'var(--theme-on-surface)',
                }}
                min={100}
                max={250}
                disabled={isSubmitting || success}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                cm
              </span>
            </div>
            {/* 臂长 */}
            <div className="flex-1 relative">
              <ArrowUpFromLine
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              />
              <input
                type="number"
                value={reach}
                onChange={(e) => setReach(e.target.value)}
                placeholder="臂长"
                className="w-full pl-9 pr-10 py-3 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-lg)',
                  color: 'var(--theme-on-surface)',
                }}
                min={100}
                max={250}
                disabled={isSubmitting || success}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                cm
              </span>
            </div>
          </div>
          <p
            className="text-xs mt-2"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            提供身体数据可以帮助其他攀登者参考 Beta 的适用性
          </p>
        </div>

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={!url || isSubmitting || success}
          className="w-full py-3 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          {isSubmitting ? '提交中...' : success ? '已提交' : '分享 Beta'}
        </button>
      </div>
    </Drawer>
  )
}
