'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'

interface UserAvatarProps {
  src?: string | null
  email?: string
  size?: number
  className?: string
}

/**
 * 用户头像展示组件
 * - 有头像：显示圆形图片
 * - 无头像：显示首字母或 User 图标 fallback
 */
export function UserAvatar({ src, email, size = 48, className = '' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const showImage = src && !imgError

  // 从邮箱提取首字母作为 fallback
  const initial = email ? email[0].toUpperCase() : null

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: showImage
          ? 'var(--theme-surface-variant)'
          : 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
      }}
    >
      {showImage ? (
        <Image
          src={src}
          alt="avatar"
          width={size}
          height={size}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
          unoptimized
        />
      ) : initial ? (
        <span
          className="font-semibold select-none"
          style={{
            fontSize: size * 0.4,
            color: 'var(--theme-primary)',
          }}
        >
          {initial}
        </span>
      ) : (
        <User
          style={{ color: 'var(--theme-primary)' }}
          size={size * 0.5}
        />
      )}
    </div>
  )
}
