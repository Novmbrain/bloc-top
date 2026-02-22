'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Loader2, X } from 'lucide-react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

import { useToast } from '@/components/ui/toast'
import { UserAvatar } from '@/components/user-avatar'
import { getCroppedBlob } from '@/lib/crop-image'

interface AvatarSectionProps {
  userImage?: string | null
  userEmail: string
  onAvatarChange?: (url: string | null) => void
  /** Reset crop state when the parent drawer closes */
  isDrawerOpen: boolean
}

export function AvatarSection({ userImage, userEmail, onAvatarChange, isDrawerOpen }: AvatarSectionProps) {
  const t = useTranslations('Profile')
  const tCommon = useTranslations('Common')
  const { showToast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarDeleting, setAvatarDeleting] = useState(false)

  // 清理 crop 状态（drawer 关闭时）
  useEffect(() => {
    if (!isDrawerOpen) {
      setCropImage(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
  }, [isDrawerOpen])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast(t('avatarInvalidFormat'), 'error')
      return
    }

    const url = URL.createObjectURL(file)
    setCropImage(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    e.target.value = ''
  }, [showToast, t])

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropCancel = useCallback(() => {
    if (cropImage) URL.revokeObjectURL(cropImage)
    setCropImage(null)
  }, [cropImage])

  const handleCropConfirm = useCallback(async () => {
    if (!cropImage || !croppedAreaPixels) return

    setAvatarUploading(true)
    try {
      let blob = await getCroppedBlob(cropImage, croppedAreaPixels)

      // 如果裁剪后仍 > 500KB，用 browser-image-compression 进一步压缩
      if (blob.size > 500 * 1024) {
        const imageCompression = (await import('browser-image-compression')).default
        const file = new File([blob], 'avatar.webp', { type: 'image/webp' })
        blob = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 512,
          useWebWorker: true,
        })
      }

      const formData = new FormData()
      formData.append('file', blob, 'avatar.webp')

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '上传失败')
      }

      const { avatarUrl } = await res.json()
      showToast(t('avatarUpdated'), 'success')
      onAvatarChange?.(avatarUrl)
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('avatarUploadFailed'),
        'error'
      )
    } finally {
      URL.revokeObjectURL(cropImage)
      setCropImage(null)
      setAvatarUploading(false)
    }
  }, [cropImage, croppedAreaPixels, showToast, t, onAvatarChange])

  const handleDeleteAvatar = useCallback(async () => {
    if (avatarDeleting) return
    setAvatarDeleting(true)
    try {
      const res = await fetch('/api/user/avatar', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showToast(t('avatarDeleted'), 'success')
      onAvatarChange?.(null)
    } catch {
      showToast(t('avatarDeleteFailed'), 'error')
    } finally {
      setAvatarDeleting(false)
    }
  }, [avatarDeleting, showToast, t, onAvatarChange])

  return (
    <>
      <div className="flex flex-col items-center">
        {/* Avatar with camera overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative group mb-2"
          disabled={avatarUploading}
        >
          <UserAvatar
            src={userImage}
            email={userEmail}
            size={96}
          />
          {/* Camera overlay */}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 group-active:opacity-100"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          >
            {avatarUploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </div>
          {/* Always-visible camera badge (bottom-right) */}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'var(--theme-primary)',
              boxShadow: 'var(--theme-shadow-sm)',
            }}
          >
            <Camera className="w-3.5 h-3.5" style={{ color: 'var(--theme-on-primary)' }} />
          </div>
        </button>

        <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
          {t('avatarTapToChange')}
        </p>

        {/* Delete avatar link */}
        {userImage && (
          <button
            onClick={handleDeleteAvatar}
            disabled={avatarDeleting}
            className="mt-1 text-xs transition-opacity disabled:opacity-40"
            style={{ color: 'var(--theme-error)' }}
          >
            {avatarDeleting ? t('avatarDeleting') : t('avatarRemove')}
          </button>
        )}

        {/* Hidden file input */}
        {/* eslint-disable-next-line no-restricted-syntax -- type="file" exempt from IME rule */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Crop overlay */}
      {cropImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: 'var(--theme-surface)' }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleCropCancel}
              disabled={avatarUploading}
              className="p-2 -ml-2"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-base font-medium" style={{ color: 'var(--theme-on-surface)' }}>
              {t('avatarCropTitle')}
            </span>
            <button
              onClick={handleCropConfirm}
              disabled={avatarUploading}
              className="px-4 py-1.5 text-sm font-medium transition-all disabled:opacity-40"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-on-primary)',
                borderRadius: 'var(--theme-radius-lg)',
              }}
            >
              {avatarUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                tCommon('confirm')
              )}
            </button>
          </div>

          <div className="relative flex-1">
            <Cropper
              image={cropImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="px-8 py-4">
            {/* eslint-disable-next-line no-restricted-syntax -- type="range" has no IME */}
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[var(--theme-primary)]"
            />
          </div>
        </div>
      )}
    </>
  )
}
