'use client'

import { useTranslations } from 'next-intl'

import { Drawer } from '@/components/ui/drawer'
import {
  AvatarSection,
  ProfileSection,
  PasswordSection,
  PasskeySection,
  AuthActionsSection,
} from '@/components/security'

interface SecurityDrawerProps {
  isOpen: boolean
  onClose: () => void
  session: { user: { email: string; role?: string; image?: string | null; name?: string; height?: number; reach?: number } }
  isAdmin: boolean
  hasEditorAccess: boolean
  onAvatarChange?: (url: string | null) => void
}

export function SecurityDrawer({ isOpen, onClose, session, isAdmin: _isAdmin, hasEditorAccess, onAvatarChange }: SecurityDrawerProps) {
  const t = useTranslations('Profile')

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      height="three-quarter"
      showHandle
      title={t('accountSettings')}
    >
      <div className="px-4 pb-6 space-y-5">
        {/* Avatar (crop + upload + delete) */}
        <AvatarSection
          userImage={session.user.image}
          userEmail={session.user.email}
          onAvatarChange={onAvatarChange}
          isDrawerOpen={isOpen}
        />

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

        {/* Profile (nickname, height, reach, ape index) */}
        <ProfileSection
          userName={session.user.name}
          userHeight={session.user.height}
          userReach={session.user.reach}
          isDrawerOpen={isOpen}
        />

        {/* Password (set / change) */}
        <PasswordSection isDrawerOpen={isOpen} />

        {/* Passkeys (list, add, delete) */}
        <PasskeySection />

        {/* Editor link + Logout */}
        <AuthActionsSection
          hasEditorAccess={hasEditorAccess}
          onClose={onClose}
        />
      </div>
    </Drawer>
  )
}
