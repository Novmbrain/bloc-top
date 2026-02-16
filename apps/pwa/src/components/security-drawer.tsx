'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { KeyRound, Fingerprint, Edit3, LogOut, Trash2, ExternalLink, Camera, Loader2, X } from 'lucide-react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { UserAvatar } from '@/components/user-avatar'
import { signOut, authClient } from '@/lib/auth-client'
import { usePasskeyManagement } from '@/hooks/use-passkey-management'
import { getPasskeyProvider } from '@/lib/passkey-providers'

interface SecurityDrawerProps {
  isOpen: boolean
  onClose: () => void
  session: { user: { email: string; role?: string; image?: string | null; name?: string; height?: number; reach?: number } }
  isAdmin: boolean
  hasEditorAccess: boolean
  onAvatarChange?: (url: string | null) => void
}

/**
 * 从原图中裁剪指定区域并返回 Blob
 */
async function getCroppedBlob(
  imageSrc: string,
  cropPixels: Area,
  maxSize = 512
): Promise<Blob> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  // 输出尺寸：取裁剪区域和 maxSize 的较小值
  const outputSize = Math.min(cropPixels.width, cropPixels.height, maxSize)
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      },
      'image/webp',
      0.85
    )
  })
}

export function SecurityDrawer({ isOpen, onClose, session, isAdmin, hasEditorAccess, onAvatarChange }: SecurityDrawerProps) {
  const tAuth = useTranslations('Auth')
  const tCommon = useTranslations('Common')
  const t = useTranslations('Profile')
  const { showToast } = useToast()

  // Passkey management
  const { passkeys, isLoading: passkeysLoading, addPasskey, deletePasskey } = usePasskeyManagement()

  // Password management state
  const [passwordExpanded, setPasswordExpanded] = useState(false)
  const [pwNewPassword, setPwNewPassword] = useState('')
  const [pwConfirmPassword, setPwConfirmPassword] = useState('')
  const [pwCurrentPassword, setPwCurrentPassword] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarDeleting, setAvatarDeleting] = useState(false)

  // Personal info state
  const [nickname, setNickname] = useState(session.user.name ?? '')
  const [height, setHeight] = useState(session.user.height?.toString() ?? '')
  const [reach, setReach] = useState(session.user.reach?.toString() ?? '')
  const [profileSaving, setProfileSaving] = useState(false)

  // Sync personal info when drawer opens with fresh session data
  useEffect(() => {
    if (isOpen) {
      setNickname(session.user.name ?? '')
      setHeight(session.user.height?.toString() ?? '')
      setReach(session.user.reach?.toString() ?? '')
    }
  }, [isOpen, session.user.name, session.user.height, session.user.reach])

  const apeIndex = useMemo(() => {
    const h = parseFloat(height)
    const r = parseFloat(reach)
    if (isNaN(h) || isNaN(r)) return null
    return r - h
  }, [height, reach])

  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true)
    try {
      const updateData: Record<string, unknown> = {
        name: nickname.trim() || undefined,
      }
      const h = parseFloat(height)
      const r = parseFloat(reach)
      if (!isNaN(h) && h > 0) updateData.height = h
      if (!isNaN(r) && r > 0) updateData.reach = r

      await authClient.updateUser(updateData)
      showToast(t('profileSaved'), 'success')
    } catch {
      showToast(t('profileSaveFailed'), 'error')
    } finally {
      setProfileSaving(false)
    }
  }, [nickname, height, reach, showToast, t])

  useEffect(() => {
    if (!isOpen) return
    authClient.listAccounts().then((res) => {
      const accounts = res.data
      if (accounts) {
        setHasPassword(accounts.some((a: { providerId?: string; provider?: string }) => a.providerId === 'credential' || a.provider === 'credential'))
      }
    }).catch(() => {
      // Silently fail
    })
  }, [isOpen])

  // 清理 crop 状态（drawer 关闭时）
  useEffect(() => {
    if (!isOpen) {
      setCropImage(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
  }, [isOpen])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 客户端初步验证
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast(t('avatarInvalidFormat'), 'error')
      return
    }

    const url = URL.createObjectURL(file)
    setCropImage(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)

    // 清空 input value 以便重复选择同一文件
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
      // 1. 裁剪
      let blob = await getCroppedBlob(cropImage, croppedAreaPixels)

      // 2. 如果裁剪后仍 > 500KB，用 browser-image-compression 进一步压缩
      if (blob.size > 500 * 1024) {
        const imageCompression = (await import('browser-image-compression')).default
        const file = new File([blob], 'avatar.webp', { type: 'image/webp' })
        blob = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 512,
          useWebWorker: true,
        })
      }

      // 3. 上传
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

  const handleSetPassword = useCallback(async () => {
    if (!pwNewPassword || !pwConfirmPassword || isSettingPassword) return
    if (pwNewPassword.length < 4) {
      showToast(tAuth('passwordTooShort'), 'error')
      return
    }
    if (pwNewPassword !== pwConfirmPassword) {
      showToast(tAuth('passwordMismatch'), 'error')
      return
    }
    setIsSettingPassword(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwNewPassword }),
      })
      if (res.ok) {
        showToast(tAuth('passwordSetSuccess'), 'success')
        setHasPassword(true)
        setPasswordExpanded(false)
        setPwNewPassword('')
        setPwConfirmPassword('')
      } else {
        showToast(tAuth('passwordSetFailed'), 'error')
      }
    } catch {
      showToast(tAuth('passwordSetFailed'), 'error')
    } finally {
      setIsSettingPassword(false)
    }
  }, [pwNewPassword, pwConfirmPassword, isSettingPassword, showToast, tAuth])

  const handleChangePassword = useCallback(async () => {
    if (!pwCurrentPassword || !pwNewPassword || !pwConfirmPassword || isSettingPassword) return
    if (pwNewPassword.length < 4) {
      showToast(tAuth('passwordTooShort'), 'error')
      return
    }
    if (pwNewPassword !== pwConfirmPassword) {
      showToast(tAuth('passwordMismatch'), 'error')
      return
    }
    setIsSettingPassword(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword: pwCurrentPassword,
        newPassword: pwNewPassword,
      })
      if (error) {
        showToast(tAuth('passwordChangeFailed'), 'error')
      } else {
        showToast(tAuth('passwordChanged'), 'success')
        setPasswordExpanded(false)
        setPwCurrentPassword('')
        setPwNewPassword('')
        setPwConfirmPassword('')
      }
    } catch {
      showToast(tAuth('passwordChangeFailed'), 'error')
    } finally {
      setIsSettingPassword(false)
    }
  }, [pwCurrentPassword, pwNewPassword, pwConfirmPassword, isSettingPassword, showToast, tAuth])

  const handleAddPasskey = useCallback(async () => {
    try {
      const result = await addPasskey()
      if (result?.error) {
        showToast(tAuth('passkeyFailed'), 'error')
      } else {
        showToast(tAuth('passkeyAdded'), 'success')
      }
    } catch {
      showToast(tAuth('passkeyFailed'), 'error')
    }
  }, [addPasskey, showToast, tAuth])

  const handleDeletePasskey = useCallback(async (id: string) => {
    try {
      await deletePasskey(id)
      showToast(tAuth('passkeyDeleted'), 'success')
    } catch {
      showToast(tAuth('passkeyFailed'), 'error')
    }
  }, [deletePasskey, showToast, tAuth])

  const handleLogout = useCallback(async () => {
    await signOut()
    showToast(tAuth('logout'), 'success')
    onClose()
  }, [showToast, tAuth, onClose])

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      height="three-quarter"
      showHandle
      title={t('accountSettings')}
    >
      <div className="px-4 pb-6 space-y-5">
        {/* === Avatar section === */}
        <div className="flex flex-col items-center">
          {/* Avatar with camera overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative group mb-2"
            disabled={avatarUploading}
          >
            <UserAvatar
              src={session.user.image}
              email={session.user.email}
              size={96}
            />
            {/* Camera overlay */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 group-active:opacity-100"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              }}
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
          {session.user.image && (
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

        {/* === Crop overlay === */}
        {cropImage && (
          <div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: 'var(--theme-surface)' }}
          >
            {/* Crop header */}
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

            {/* Cropper area */}
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

            {/* Zoom slider */}
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

        {/* Email header */}
        <div
          className="glass-light flex items-center gap-3 p-3"
          style={{ borderRadius: 'var(--theme-radius-lg)' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))' }}
          >
            ✉️
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>
            {session.user.email}
          </p>
        </div>

        {/* Personal info section */}
        <div className="space-y-2.5">
          <Input
            value={nickname}
            onChange={setNickname}
            placeholder={t('nicknamePlaceholder')}
            variant="form"
            maxLength={20}
          />
          <div className="grid grid-cols-2 gap-2">
            {/* eslint-disable-next-line no-restricted-syntax -- type="number" exempt from IME */}
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder={t('heightPlaceholder')}
              min={100}
              max={250}
              className="w-full p-2.5 text-sm"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                color: 'var(--theme-on-surface)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--theme-radius-lg)',
              }}
            />
            {/* eslint-disable-next-line no-restricted-syntax -- type="number" exempt from IME */}
            <input
              type="number"
              value={reach}
              onChange={(e) => setReach(e.target.value)}
              placeholder={t('reachPlaceholder')}
              min={100}
              max={280}
              className="w-full p-2.5 text-sm"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                color: 'var(--theme-on-surface)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--theme-radius-lg)',
              }}
            />
          </div>
          {apeIndex !== null && (
            <div
              className="flex items-center justify-between p-2.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
                borderRadius: 'var(--theme-radius-lg)',
              }}
            >
              <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                {t('apeIndex')}
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: apeIndex >= 0 ? 'var(--theme-success)' : 'var(--theme-on-surface)' }}
              >
                {apeIndex >= 0
                  ? t('apeIndexPositive', { value: apeIndex.toFixed(1) })
                  : t('apeIndexNegative', { value: apeIndex.toFixed(1) })}
              </span>
            </div>
          )}
          <button
            onClick={handleSaveProfile}
            disabled={profileSaving}
            className="w-full p-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          >
            {t('saveProfile')}
          </button>
        </div>

        {/* Password section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
              {hasPassword ? tAuth('hasPassword') : tAuth('noPassword')}
            </span>
          </div>

          {!passwordExpanded ? (
            <button
              onClick={() => setPasswordExpanded(true)}
              className="text-sm font-medium"
              style={{ color: 'var(--theme-primary)' }}
            >
              {hasPassword ? tAuth('changePassword') : tAuth('setPassword')}
            </button>
          ) : (
            <div className="space-y-2">
              {hasPassword && (
                <Input
                  value={pwCurrentPassword}
                  onChange={setPwCurrentPassword}
                  placeholder={tAuth('currentPassword')}
                  variant="form"
                  type="password"
                  autoComplete="current-password"
                />
              )}
              <Input
                value={pwNewPassword}
                onChange={setPwNewPassword}
                placeholder={tAuth('newPassword')}
                variant="form"
                type="password"
                autoComplete="new-password"
              />
              <Input
                value={pwConfirmPassword}
                onChange={setPwConfirmPassword}
                placeholder={tAuth('confirmPassword')}
                variant="form"
                type="password"
                autoComplete="new-password"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPasswordExpanded(false)
                    setPwCurrentPassword('')
                    setPwNewPassword('')
                    setPwConfirmPassword('')
                  }}
                  className="flex-1 p-2.5 text-sm font-medium transition-all active:scale-[0.98]"
                  style={{
                    color: 'var(--theme-on-surface-variant)',
                    borderRadius: 'var(--theme-radius-lg)',
                  }}
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={hasPassword ? handleChangePassword : handleSetPassword}
                  disabled={isSettingPassword}
                  className="flex-1 p-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-on-primary)',
                    borderRadius: 'var(--theme-radius-lg)',
                  }}
                >
                  {hasPassword ? tAuth('changePassword') : tAuth('setPassword')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Passkey section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Fingerprint className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
              {tAuth('registeredPasskeys')}
            </span>
          </div>
          {passkeysLoading ? (
            <div
              className="h-10 rounded-lg skeleton-shimmer"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            />
          ) : passkeys.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {tAuth('noPasskeys')}
            </p>
          ) : (
            <div className="space-y-2">
              {passkeys.map((pk) => {
                const provider = getPasskeyProvider(pk.aaguid)
                return (
                  <div
                    key={pk.id}
                    className="glass-light flex items-center gap-2.5 p-2.5"
                    style={{ borderRadius: 'var(--theme-radius-lg)' }}
                  >
                    <span className="text-lg leading-none" role="img" aria-label={provider.name}>
                      {provider.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-on-surface)' }}>
                        {pk.name || provider.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                        {new Date(pk.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePasskey(pk.id)}
                      className="p-1.5 rounded-full transition-all active:scale-90 shrink-0"
                      style={{ color: 'var(--theme-error)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <button
            onClick={handleAddPasskey}
            className="mt-2 text-sm font-medium"
            style={{ color: 'var(--theme-primary)' }}
          >
            + {tAuth('addDevice')}
          </button>
        </div>

        {/* Editor entry (admin or manager with crag permissions) */}
        {hasEditorAccess && (
          <a
            href={process.env.NEXT_PUBLIC_EDITOR_URL || 'https://editor.bouldering.top'}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-light w-full flex items-center gap-3 p-3 transition-all active:scale-[0.98]"
            style={{ borderRadius: 'var(--theme-radius-lg)' }}
          >
            <Edit3 className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>
              {t('editorEntry')}
            </span>
            <ExternalLink className="w-4 h-4" style={{ color: 'var(--theme-on-surface-variant)' }} />
          </a>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            color: 'var(--theme-error)',
            borderRadius: 'var(--theme-radius-lg)',
            backgroundColor: 'color-mix(in srgb, var(--theme-error) 8%, transparent)',
          }}
        >
          <LogOut className="w-4 h-4" />
          {tAuth('logout')}
        </button>
      </div>
    </Drawer>
  )
}
