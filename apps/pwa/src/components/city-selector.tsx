'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { findPrefectureByDistrictId, findCityById } from '@/lib/city-utils'
import type { CityConfig, PrefectureConfig, CitySelection } from '@/types'

// ==================== 类型 ====================

interface CitySelectorProps {
  /** 当前选中的城市（兼容字段，用于标题显示） */
  currentCity: CityConfig
  /** 当前选择状态（区分城市/地级市） */
  currentSelection: CitySelection
  /** 所有可选城市 */
  cities: CityConfig[]
  /** 所有地级市配置 */
  prefectures: PrefectureConfig[]
  /** 选择切换回调（支持城市和地级市） */
  onSelectionChange: (selection: CitySelection) => void
}

// ==================== 组件 ====================

/**
 * 城市选择器组件
 *
 * 支持两级选择：地级市 → 区/县
 * - 单区地级市（如厦门）：点击直接选中该区
 * - 多区地级市（如福州）：
 *   - 点击名称 → 选中整个地级市（聚合浏览）
 *   - 点击箭头 → 展开子区域列表
 */
export function CitySelector({
  currentCity,
  currentSelection,
  cities,
  prefectures,
  onSelectionChange,
}: CitySelectorProps) {
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
      if (currentSelection.type === 'city') {
        const pref = findPrefectureByDistrictId(prefectures, currentSelection.id)
        if (pref && pref.districts.length > 1) {
          setExpandedPrefecture(pref.id)
        } else {
          setExpandedPrefecture(null)
        }
      } else {
        // 地级市选中时，展开该地级市
        setExpandedPrefecture(currentSelection.id)
      }
    }
  }

  const handleSelectCity = (cityId: string) => {
    onSelectionChange({ type: 'city', id: cityId })
    setIsOpen(false)
  }

  const handleSelectPrefecture = (prefId: string) => {
    onSelectionChange({ type: 'prefecture', id: prefId })
    setIsOpen(false)
  }

  // 标题显示逻辑
  const getTitleText = () => {
    if (currentSelection.type === 'prefecture') {
      // 地级市选中 → 显示地级市名
      const pref = prefectures.find((p) => p.id === currentSelection.id)
      return pref?.name ?? currentCity.name
    }
    // 区/县选中 → 显示 "地级市 · 区名"（避免 "厦门 · 厦门"）
    const prefecture = findPrefectureByDistrictId(prefectures, currentCity.id)
    return prefecture && prefecture.name !== currentCity.name
      ? `${prefecture.name} · ${currentCity.name}`
      : currentCity.name
  }

  // 获取地级市翻译 key
  const getPrefTranslationKey = (prefId: string) =>
    `prefecture${prefId.charAt(0).toUpperCase()}${prefId.slice(1)}` as Parameters<typeof t>[0]

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
          {getTitleText()}
        </h1>
        <ChevronDown
          className="w-6 h-6 mt-1 transition-transform duration-200"
          style={{
            color: 'var(--theme-on-surface-variant)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className="glass-heavy absolute top-full left-0 mt-2 min-w-[160px] py-1 z-50 animate-fade-in"
          style={{
            borderRadius: 'var(--theme-radius-lg)',
          }}
        >
          {prefectures.map((pref) => {
            const isSingleDistrict = pref.districts.length === 1
            const isExpanded = expandedPrefecture === pref.id

            if (isSingleDistrict) {
              // 单区地级市：直接选中区/县
              const districtId = pref.districts[0]
              const city = findCityById(cities, districtId)
              if (!city) return null
              const isSelected =
                currentSelection.type === 'city' && currentSelection.id === districtId

              return (
                <button
                  key={pref.id}
                  onClick={() => handleSelectCity(districtId)}
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
                      {t(getPrefTranslationKey(pref.id))}
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

            // 多区地级市：分双操作区域
            const isPrefSelected =
              currentSelection.type === 'prefecture' && currentSelection.id === pref.id

            return (
              <div key={pref.id}>
                {/* 地级市行：左侧名称区 + 右侧箭头区 */}
                <div
                  className="flex items-center transition-colors"
                  style={{
                    backgroundColor: isPrefSelected
                      ? 'color-mix(in srgb, var(--theme-primary) 12%, transparent)'
                      : 'transparent',
                  }}
                >
                  {/* 左侧：点击选中整个地级市 */}
                  <button
                    onClick={() => handleSelectPrefecture(pref.id)}
                    className="flex-1 px-4 py-2.5 flex items-center gap-2 text-left transition-colors"
                    style={{ color: 'var(--theme-on-surface)' }}
                  >
                    <span className="font-medium">
                      {t(getPrefTranslationKey(pref.id))}
                    </span>
                    {isPrefSelected && (
                      <Check
                        className="w-4 h-4"
                        style={{ color: 'var(--theme-primary)' }}
                      />
                    )}
                  </button>

                  {/* 右侧：展开/折叠箭头 */}
                  <button
                    onClick={() =>
                      setExpandedPrefecture(isExpanded ? null : pref.id)
                    }
                    className="px-3 py-2.5 transition-colors"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    <ChevronRight
                      className="w-4 h-4 transition-transform duration-200"
                      style={{
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                </div>

                {/* 展开的子区域列表 */}
                {isExpanded &&
                  pref.districts.map((districtId) => {
                    const city = findCityById(cities, districtId)
                    if (!city) return null
                    const isSelected =
                      currentSelection.type === 'city' && currentSelection.id === districtId

                    return (
                      <button
                        key={districtId}
                        onClick={() => handleSelectCity(districtId)}
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
