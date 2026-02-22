'use client'

import { useTranslations } from 'next-intl'
import { Video } from 'lucide-react'
import type { BetaLink } from '@/types'

interface RouteBetaSectionProps {
  betaLinks: BetaLink[]
  onOpenBetaList: () => void
}

export function RouteBetaSection({ betaLinks, onOpenBetaList }: RouteBetaSectionProps) {
  const tBeta = useTranslations('Beta')
  const betaCount = betaLinks.length

  return (
    <button
      onClick={onOpenBetaList}
      className="w-full py-3 px-4 flex items-center justify-between transition-transform active:scale-[0.98] glass-light"
      style={{
        borderRadius: 'var(--theme-radius-xl)',
        border: betaCount > 0
          ? '1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent)'
          : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: betaCount > 0
              ? 'var(--theme-primary)'
              : 'var(--theme-outline)',
          }}
        >
          <Video className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <span
            className="text-sm font-medium block"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {tBeta('title')}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {betaCount > 0 ? tBeta('videoCount', { count: betaCount }) : tBeta('noVideo')}
          </span>
        </div>
      </div>
      {betaCount > 0 && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
          }}
        >
          {betaCount}
        </div>
      )}
    </button>
  )
}
