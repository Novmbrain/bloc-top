'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, Map, SlidersHorizontal, Play, Heart, Mountain } from 'lucide-react'

export default function IntroPage() {
  const t = useTranslations('Intro')

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
      <section className="px-6 pt-8 pb-12 text-center animate-fade-in">
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
              className="flex items-start gap-4 p-4 animate-fade-in-up"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface))',
                borderRadius: 'var(--theme-radius-xl)',
                animationDelay: `${i * 100}ms`,
                animationFillMode: 'backwards',
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
            <div
              key={i}
              className="flex items-center gap-3 animate-fade-in-up"
              style={{
                animationDelay: `${300 + i * 80}ms`,
                animationFillMode: 'backwards',
              }}
            >
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
          className="p-5 text-center animate-fade-in-up"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
            borderRadius: 'var(--theme-radius-xl)',
            animationDelay: '600ms',
            animationFillMode: 'backwards',
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
