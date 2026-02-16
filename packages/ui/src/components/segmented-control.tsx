'use client'

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react'

/**
 * 单个选项的配置
 */
export interface SegmentOption<T extends string> {
  /** 选项值 */
  value: T
  /** 显示标签 */
  label: string
  /** 可选图标 */
  icon?: ReactNode
}

/**
 * SegmentedControl 组件属性
 */
interface SegmentedControlProps<T extends string> {
  /** 选项列表 */
  options: SegmentOption<T>[]
  /** 当前选中值 */
  value: T
  /** 值变化回调 */
  onChange: (value: T) => void
  /** 无障碍标签 */
  ariaLabel?: string
  /** 额外样式类 */
  className?: string
  /** 尺寸变体 */
  size?: 'sm' | 'md'
}

/**
 * 分段控制器组件
 *
 * 一个带滑动动画的分段选择器，类似 iOS 风格的 Segmented Control。
 * 支持图标、文字或两者组合。
 *
 * @example
 * ```tsx
 * <SegmentedControl
 *   options={[
 *     { value: 'light', label: '日间', icon: <Sun /> },
 *     { value: 'dark', label: '暗夜', icon: <Moon /> },
 *   ]}
 *   value={theme}
 *   onChange={setTheme}
 *   ariaLabel="主题选择"
 * />
 * ```
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const [mounted, setMounted] = useState(false)

  // 确保客户端渲染（Next.js SSR hydration 标准模式）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration 必需
    setMounted(true)
  }, [])

  // 计算滑块位置
  const updateIndicator = useCallback(() => {
    if (!containerRef.current) return

    const activeIndex = options.findIndex((opt) => opt.value === value)
    if (activeIndex === -1) return

    const buttons = containerRef.current.querySelectorAll('[role="tab"]')
    const activeButton = buttons[activeIndex] as HTMLButtonElement

    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      })
    }
  }, [options, value])

  // 初始化和值变化时更新指示器
  useEffect(() => {
    if (mounted) {
      updateIndicator()
    }
  }, [mounted, updateIndicator])

  // 窗口大小变化时重新计算
  useEffect(() => {
    if (!mounted) return

    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [mounted, updateIndicator])

  // 尺寸配置
  const sizeConfig = {
    sm: {
      padding: 'p-0.5',
      buttonPadding: 'py-1.5 px-2',
      iconSize: 'w-3.5 h-3.5',
      textSize: 'text-xs',
      gap: 'gap-1',
    },
    md: {
      padding: 'p-1',
      buttonPadding: 'py-2.5 px-3',
      iconSize: 'w-4 h-4',
      textSize: 'text-sm',
      gap: 'gap-1.5',
    },
  }

  const config = sizeConfig[size]

  // SSR 骨架占位
  if (!mounted) {
    return (
      <div
        className={`h-12 rounded-xl animate-pulse ${className || ''}`}
        style={{ backgroundColor: 'var(--theme-surface-variant)' }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex ${config.padding} rounded-xl ${className || ''}`}
      style={{
        backgroundColor: 'var(--theme-surface-variant)',
      }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {/* 滑动背景指示器 */}
      <div
        className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          backgroundColor: 'var(--theme-surface)',
          boxShadow: 'var(--theme-shadow-sm)',
          // Apple 风格弹性曲线
          transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      />

      {/* 选项按钮 */}
      {options.map((option) => {
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex-1 flex items-center justify-center ${config.gap} ${config.buttonPadding} rounded-lg transition-colors duration-200`}
            style={{
              color: isSelected
                ? 'var(--theme-primary)'
                : 'var(--theme-on-surface-variant)',
            }}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`panel-${option.value}`}
          >
            {option.icon && (
              <span
                className={`${config.iconSize} transition-transform duration-200 flex items-center justify-center`}
                style={{
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {option.icon}
              </span>
            )}
            <span
              className={`${config.textSize} transition-all duration-200`}
              style={{
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
