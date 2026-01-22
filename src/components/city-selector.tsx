'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Check, MapPin } from 'lucide-react'
import type { CityConfig, CityId } from '@/lib/city-config'

// ==================== 类型 ====================

interface CitySelectorProps {
  /** 当前选中的城市 */
  currentCity: CityConfig
  /** 所有可选城市 */
  cities: CityConfig[]
  /** 城市切换回调 */
  onCityChange: (cityId: CityId) => void
  /** 是否显示首次访问提示 */
  showHint?: boolean
  /** 关闭提示回调 */
  onDismissHint?: () => void
}

// ==================== 组件 ====================

/**
 * 城市选择器组件
 *
 * 点击城市名称展开下拉菜单，支持：
 * - 首次访问提示引导
 * - 城市切换动画
 * - 不可用城市标记
 */
export function CitySelector({
  currentCity,
  cities,
  onCityChange,
  showHint = false,
  onDismissHint,
}: CitySelectorProps) {
  const t = useTranslations('CitySelector')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
    // 点击时关闭首次访问提示
    if (showHint && onDismissHint) {
      onDismissHint()
    }
  }

  const handleSelect = (cityId: CityId) => {
    onCityChange(cityId)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 城市标题（可点击） */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1 active:scale-95 transition-transform"
      >
        <h1
          className="text-4xl font-bold tracking-wide leading-tight"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          {currentCity.name}
        </h1>
        <ChevronDown
          className="w-6 h-6 mt-1 transition-transform duration-200"
          style={{
            color: 'var(--theme-on-surface-variant)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* 首次访问提示 */}
      {showHint && (
        <p
          className="text-xs mt-1 animate-fade-in flex items-center gap-1"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          <MapPin className="w-3 h-3" />
          {t('firstVisitHint')}
        </p>
      )}

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 min-w-[140px] py-1 z-50 animate-fade-in"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderRadius: 'var(--theme-radius-lg)',
            boxShadow: 'var(--theme-shadow-lg)',
            border: '1px solid var(--theme-outline-variant)',
          }}
        >
          {cities.map((city) => (
            <button
              key={city.id}
              onClick={() => handleSelect(city.id)}
              disabled={!city.available && city.id !== currentCity.id}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors"
              style={{
                backgroundColor:
                  city.id === currentCity.id
                    ? 'color-mix(in srgb, var(--theme-primary) 12%, transparent)'
                    : 'transparent',
                color: city.available
                  ? 'var(--theme-on-surface)'
                  : 'var(--theme-on-surface-variant)',
                opacity: city.available ? 1 : 0.6,
              }}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{city.name}</span>
                {!city.available && (
                  <span
                    className="text-xs px-1.5 py-0.5"
                    style={{
                      backgroundColor: 'var(--theme-surface-variant)',
                      borderRadius: 'var(--theme-radius-sm)',
                    }}
                  >
                    {t('comingSoon')}
                  </span>
                )}
              </span>
              {city.id === currentCity.id && (
                <Check
                  className="w-4 h-4"
                  style={{ color: 'var(--theme-primary)' }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
