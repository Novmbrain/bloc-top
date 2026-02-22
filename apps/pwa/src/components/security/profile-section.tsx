'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { authClient } from '@/lib/auth-client'

interface ProfileSectionProps {
  userName?: string
  userHeight?: number
  userReach?: number
  isDrawerOpen: boolean
}

export function ProfileSection({ userName, userHeight, userReach, isDrawerOpen }: ProfileSectionProps) {
  const t = useTranslations('Profile')
  const { showToast } = useToast()

  const [nickname, setNickname] = useState(userName ?? '')
  const [height, setHeight] = useState(userHeight?.toString() ?? '')
  const [reach, setReach] = useState(userReach?.toString() ?? '')
  const [profileSaving, setProfileSaving] = useState(false)

  // Sync when drawer opens with fresh session data
  useEffect(() => {
    if (isDrawerOpen) {
      setNickname(userName ?? '')
      setHeight(userHeight?.toString() ?? '')
      setReach(userReach?.toString() ?? '')
    }
  }, [isDrawerOpen, userName, userHeight, userReach])

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

  return (
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
  )
}
