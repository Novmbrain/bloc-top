'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Map, SlidersHorizontal, Play, Heart, Mountain } from 'lucide-react'

export default function IntroPage() {
  const t = useTranslations('Intro')
  const router = useRouter()

  const features = [
    { icon: <Map className="w-6 h-6" />, title: t('featureTopo'), desc: t('featureTopoDesc') },
    { icon: <SlidersHorizontal className="w-6 h-6" />, title: t('featureFilter'), desc: t('featureFilterDesc') },
    { icon: <Play className="w-6 h-6" />, title: t('featureBeta'), desc: t('featureBetaDesc') },
  ]

  const steps = [
    t('step1'),
    t('step2'),
    t('step3'),
    t('step4'),
  ]

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--theme-surface)',
        color: 'var(--theme-on-surface)',
      }}
    >
      {/* Hero Section */}
      <section className="px-6 pt-16 pb-12 text-center">
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
          className="text-base leading-relaxed"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          {t('heroSubtitle')}
        </p>
      </section>

      {/* Features Section */}
      <section className="px-6 pb-10">
        <h2 className="text-lg font-bold mb-4">{t('featuresTitle')}</h2>
        <div className="space-y-3">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface))',
                borderRadius: 'var(--theme-radius-xl)',
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                }}
              >
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold mb-0.5">{feature.title}</p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Steps Section */}
      <section className="px-6 pb-10">
        <h2 className="text-lg font-bold mb-4">{t('stepsTitle')}</h2>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                }}
              >
                {i + 1}
              </div>
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Community Section */}
      <section className="px-6 pb-10">
        <div
          className="p-5 text-center"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          <Heart
            className="w-8 h-8 mx-auto mb-3"
            style={{ color: 'var(--theme-primary)' }}
          />
          <h2 className="text-lg font-bold mb-2">{t('communityTitle')}</h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {t('communityDesc')}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16">
        <button
          onClick={() => router.push('/')}
          className="w-full py-4 text-base font-bold transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-xl)',
            boxShadow: 'var(--theme-shadow-md)',
          }}
        >
          {t('cta')}
        </button>
      </section>
    </div>
  )
}
