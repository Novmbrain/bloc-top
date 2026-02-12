'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronRight, Check, MapPin } from 'lucide-react'
import { PREFECTURES, getPrefectureByDistrictId, getCityById } from '@/lib/city-config'
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
 * 支持两级选择：地级市 → 区/县
 * - 单区地级市（如厦门）：点击直接选中
 * - 多区地级市（如福州）：点击展开子区域列表
 */
export function CitySelector({
  currentCity,
  cities: _cities,
  onCityChange,
  showHint = false,
  onDismissHint,
}: CitySelectorProps) {
  void _cities // props interface unchanged; data now comes from PREFECTURES
  const t = useTranslations('CitySelector')
  const [isOpen, setIsOpen] = useState(false)
  const [expandedPrefecture, setExpandedPrefecture] = useState<string | null>(null)
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
    const willOpen = !isOpen
    setIsOpen(willOpen)
    // 打开下拉时，自动展开当前选中区域的父级地级市
    if (willOpen) {
      const pref = getPrefectureByDistrictId(currentCity.id)
      if (pref && pref.districts.length > 1) {
        setExpandedPrefecture(pref.id)
      } else {
        setExpandedPrefecture(null)
      }
    }
    if (showHint && onDismissHint) {
      onDismissHint()
    }
  }

  const handleSelect = (cityId: CityId) => {
    onCityChange(cityId)
    setIsOpen(false)
  }

  // 标题显示：地级市 · 区名（避免 "厦门 · 厦门"）
  const prefecture = getPrefectureByDistrictId(currentCity.id)
  const titleText =
    prefecture && prefecture.name !== currentCity.name
      ? `${prefecture.name} · ${currentCity.name}`
      : currentCity.name

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
          {titleText}
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
          className="glass-heavy absolute top-full left-0 mt-2 min-w-[160px] py-1 z-50 animate-fade-in"
          style={{
            borderRadius: 'var(--theme-radius-lg)',
          }}
        >
          {PREFECTURES.map((pref) => {
            const isSingleDistrict = pref.districts.length === 1
            const isExpanded = expandedPrefecture === pref.id

            if (isSingleDistrict) {
              // 单区地级市：直接选中
              const districtId = pref.districts[0]
              const city = getCityById(districtId)
              if (!city) return null
              const isSelected = districtId === currentCity.id

              return (
                <button
                  key={pref.id}
                  onClick={() => handleSelect(districtId)}
                  disabled={!city.available && !isSelected}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--theme-primary) 12%, transparent)'
                      : 'transparent',
                    color: city.available
                      ? 'var(--theme-on-surface)'
                      : 'var(--theme-on-surface-variant)',
                    opacity: city.available ? 1 : 0.6,
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">
                      {t(`prefecture${pref.id.charAt(0).toUpperCase()}${pref.id.slice(1)}` as Parameters<typeof t>[0])}
                    </span>
                    {!city.available && (
                      <span
                        className="text-xs px-1.5 py-0.5 glass-light"
                        style={{
                          borderRadius: 'var(--theme-radius-sm)',
                        }}
                      >
                        {t('comingSoon')}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check
                      className="w-4 h-4"
                      style={{ color: 'var(--theme-primary)' }}
                    />
                  )}
                </button>
              )
            }

            // 多区地级市：展开/折叠
            return (
              <div key={pref.id}>
                <button
                  onClick={() =>
                    setExpandedPrefecture(isExpanded ? null : pref.id)
                  }
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors"
                  style={{ color: 'var(--theme-on-surface)' }}
                >
                  <span className="font-medium">
                    {t(`prefecture${pref.id.charAt(0).toUpperCase()}${pref.id.slice(1)}` as Parameters<typeof t>[0])}
                  </span>
                  <ChevronRight
                    className="w-4 h-4 transition-transform duration-200"
                    style={{
                      color: 'var(--theme-on-surface-variant)',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {/* 展开的子区域列表 */}
                {isExpanded &&
                  pref.districts.map((districtId) => {
                    const city = getCityById(districtId)
                    if (!city) return null
                    const isSelected = districtId === currentCity.id

                    return (
                      <button
                        key={districtId}
                        onClick={() => handleSelect(districtId)}
                        disabled={!city.available && !isSelected}
                        className="w-full pl-8 pr-4 py-2 flex items-center justify-between text-left transition-colors"
                        style={{
                          backgroundColor: isSelected
                            ? 'color-mix(in srgb, var(--theme-primary) 12%, transparent)'
                            : 'transparent',
                          color: city.available
                            ? 'var(--theme-on-surface)'
                            : 'var(--theme-on-surface-variant)',
                          opacity: city.available ? 1 : 0.6,
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{city.name}</span>
                          {!city.available && (
                            <span
                              className="text-xs px-1.5 py-0.5 glass-light"
                              style={{
                                borderRadius: 'var(--theme-radius-sm)',
                              }}
                            >
                              {t('comingSoon')}
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <Check
                            className="w-4 h-4"
                            style={{ color: 'var(--theme-primary)' }}
                          />
                        )}
                      </button>
                    )
                  })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
