'use client'

import { MapPin, Construction } from 'lucide-react'
import type { CityConfig } from '@/lib/city-config'

interface EmptyCityProps {
  city: CityConfig
}

/**
 * 城市数据待录入空状态组件
 *
 * 当用户选择了一个尚无数据的城市时显示
 */
export function EmptyCity({ city }: EmptyCityProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      style={{ color: 'var(--theme-on-surface-variant)' }}
    >
      {/* 图标 */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)',
        }}
      >
        <Construction
          className="w-10 h-10"
          style={{ color: 'var(--theme-primary)' }}
        />
      </div>

      {/* 标题 */}
      <h2
        className="text-xl font-bold mb-2"
        style={{ color: 'var(--theme-on-surface)' }}
      >
        {city.name}岩场数据录入中
      </h2>

      {/* 描述 */}
      <p className="text-sm mb-6 max-w-[280px]">
        我们正在收集{city.name}地区的攀岩线路信息，
        <br />
        敬请期待！
      </p>

      {/* 提示卡片 */}
      <div
        className="w-full max-w-[320px] p-4 flex items-start gap-3"
        style={{
          backgroundColor: 'var(--theme-surface-variant)',
          borderRadius: 'var(--theme-radius-lg)',
        }}
      >
        <MapPin
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          style={{ color: 'var(--theme-primary)' }}
        />
        <div className="text-left">
          <p
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            想要贡献数据？
          </p>
          <p className="text-xs">
            如果你了解{city.name}的攀岩线路，
            欢迎联系我们提供信息～
          </p>
        </div>
      </div>
    </div>
  )
}
