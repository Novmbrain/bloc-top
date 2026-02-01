'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, Map, SlidersHorizontal, Maximize, Play, Heart, Mountain } from 'lucide-react'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'

interface Scene {
  num: number
  icon: React.ReactNode
  titleKey: string
  descKey: string
}

export default function IntroPage() {
  const t = useTranslations('Intro')
  const containerRef = useScrollReveal<HTMLDivElement>()

  const scenes: Scene[] = [
    {
      num: 1,
      icon: <Map className="w-6 h-6" />,
      titleKey: 'scene1Title',
      descKey: 'scene1Desc',
    },
    {
      num: 2,
      icon: <><SlidersHorizontal className="w-5 h-5" /><Maximize className="w-5 h-5" /></>,
      titleKey: 'scene2Title',
      descKey: 'scene2Desc',
    },
    {
      num: 3,
      icon: <Play className="w-6 h-6" />,
      titleKey: 'scene3Title',
      descKey: 'scene3Desc',
    },
    {
      num: 4,
      icon: <Heart className="w-6 h-6" />,
      titleKey: 'scene4Title',
      descKey: 'scene4Desc',
    },
  ]

  return (
    <div
      ref={containerRef}
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--theme-surface)',
        color: 'var(--theme-on-surface)',
      }}
    >
      {/* Back Button */}
      <nav className="px-4 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors"
          style={{
            color: 'var(--theme-primary)',
            borderRadius: 'var(--theme-radius-lg)',
          }}
          aria-label={t('backToHome')}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToHome')}
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-8 pb-14 text-center scroll-reveal">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg, var(--theme-primary), color-mix(in srgb, var(--theme-primary) 70%, var(--theme-surface)))',
            boxShadow: 'var(--theme-shadow-lg)',
          }}
        >
          <Mountain className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-3">{t('heroTitle')}</h1>
        <p
          className="text-base leading-relaxed max-w-xs mx-auto"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          {t('heroSubtitle')}
        </p>
      </section>

      {/* Scene Timeline */}
      <section className="px-6 pb-10">
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-[19px] top-6 bottom-6 w-[2px]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 20%, var(--theme-surface))',
            }}
          />

          <div className="space-y-8">
            {scenes.map((scene, i) => (
              <div
                key={scene.num}
                className="relative flex items-start gap-4 scroll-reveal"
                style={{ '--reveal-delay': `${i * 100}ms` } as React.CSSProperties}
              >
                {/* Number circle */}
                <div
                  className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-on-primary)',
                  }}
                >
                  {scene.num}
                </div>

                {/* Content card */}
                <div
                  className="flex-1 min-w-0 p-4"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 6%, var(--theme-surface))',
                    borderRadius: 'var(--theme-radius-xl)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <h2 className="text-base font-semibold">{t(scene.titleKey)}</h2>
                    <span
                      className="flex items-center gap-1"
                      style={{ color: 'var(--theme-primary)', opacity: 0.7 }}
                    >
                      {scene.icon}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    {t(scene.descKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16 scroll-reveal" style={{ '--reveal-delay': '200ms' } as React.CSSProperties}>
        <Link
          href="/"
          className="block w-full py-4 text-center text-base font-bold transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-xl)',
            boxShadow: 'var(--theme-shadow-md)',
          }}
        >
          {t('cta')}
        </Link>
      </section>
    </div>
  )
}
