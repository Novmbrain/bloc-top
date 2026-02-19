'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Plus, Loader2 } from 'lucide-react'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { useToast } from '@bloctop/ui/components/toast'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import { useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import type { CityConfig, PrefectureConfig } from '@bloctop/shared/types'
import { CityCard } from '@/components/editor/city-card'
import { PrefectureCard } from '@/components/editor/prefecture-card'
import { CityFormModal } from '@/components/editor/city-form-modal'
import { PrefectureFormModal } from '@/components/editor/prefecture-form-modal'

// ==================== 城市管理页面 ====================

export default function CityManagementPage() {
  useBreakAppShellLimit()
  const { showToast } = useToast()
  const { data: session, isPending: isSessionPending } = useSession()
  const router = useRouter()
  const userRole = (session?.user as { role?: string })?.role || 'user'

  // Admin-only 守卫：非 admin 重定向到编辑器首页
  useEffect(() => {
    if (!isSessionPending && userRole !== 'admin') {
      router.replace('/')
    }
  }, [isSessionPending, userRole, router])

  const [cities, setCities] = useState<CityConfig[]>([])
  const [prefectures, setPrefectures] = useState<PrefectureConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCity, setEditingCity] = useState<CityConfig | null>(null)
  const [editingPrefecture, setEditingPrefecture] = useState<PrefectureConfig | null>(null)
  const [showCityForm, setShowCityForm] = useState(false)
  const [showPrefectureForm, setShowPrefectureForm] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/cities')
      const data = await res.json()
      if (data.success) {
        setCities(data.cities)
        setPrefectures(data.prefectures)
      }
    } catch {
      showToast('加载城市数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleAvailable = async (city: CityConfig) => {
    const newAvailable = !city.available
    setCities(prev => prev.map(c => c.id === city.id ? { ...c, available: newAvailable } : c))
    const rollback = () => setCities(prev => prev.map(c => c.id === city.id ? { ...c, available: !newAvailable } : c))
    try {
      const res = await fetch(`/api/cities/${city.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available: newAvailable }) })
      const data = await res.json()
      if (!data.success) { rollback(); showToast(data.error || '更新失败', 'error') }
    } catch {
      rollback(); showToast('更新失败', 'error')
    }
  }

  if (loading || isSessionPending || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--theme-primary)' }} />
      </div>
    )
  }

  const addBtn = (onClick: () => void) => (
    <button onClick={onClick} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all active:scale-95" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', color: 'var(--theme-primary)' }}>
      <Plus className="w-4 h-4" />新增
    </button>
  )

  const allDistricts = new Set(prefectures.flatMap((p) => p.districts))
  const ungrouped = cities.filter((c) => !allDistricts.has(c.id))

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ backgroundColor: 'var(--theme-surface)' }}>
      <EditorPageHeader
        title="城市管理"
        icon={<MapPin className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />}
        isDetailMode={false}
        onBackToList={() => {}}
        listLabel="城市列表"
      />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* ==================== 地级市管理 ==================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>地级市</h2>
            {addBtn(() => { setEditingPrefecture(null); setShowPrefectureForm(true) })}
          </div>
          {prefectures.map((pref) => (
            <PrefectureCard
              key={pref.id}
              prefecture={pref}
              onEdit={() => { setEditingPrefecture(pref); setShowPrefectureForm(true) }}
            />
          ))}
        </section>

        {/* ==================== 城市管理 ==================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>城市（区/县）</h2>
            {addBtn(() => { setEditingCity(null); setShowCityForm(true) })}
          </div>

          {/* 按地级市分组显示 */}
          {prefectures.map((pref) => {
            const prefCities = pref.districts
              .map((d) => cities.find((c) => c.id === d))
              .filter(Boolean) as CityConfig[]
            if (prefCities.length === 0) return null
            return (
              <div key={pref.id} className="mb-4">
                <h3 className="text-sm font-medium mb-2 px-1" style={{ color: 'var(--theme-on-surface-variant)' }}>{pref.name}</h3>
                {prefCities.map((city) => (
                  <CityCard
                    key={city.id}
                    city={city}
                    onToggle={() => toggleAvailable(city)}
                    onEdit={() => { setEditingCity(city); setShowCityForm(true) }}
                  />
                ))}
              </div>
            )
          })}

          {/* 未分组的城市 */}
          {ungrouped.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 px-1" style={{ color: 'var(--theme-on-surface-variant)' }}>未分组</h3>
              {ungrouped.map((city) => (
                <CityCard
                  key={city.id}
                  city={city}
                  onToggle={() => toggleAvailable(city)}
                  onEdit={() => { setEditingCity(city); setShowCityForm(true) }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showCityForm && (
        <CityFormModal
          city={editingCity}
          prefectures={prefectures}
          onClose={() => { setShowCityForm(false); setEditingCity(null) }}
          onSaved={() => { setShowCityForm(false); setEditingCity(null); fetchData() }}
        />
      )}

      {showPrefectureForm && (
        <PrefectureFormModal
          prefecture={editingPrefecture}
          onClose={() => { setShowPrefectureForm(false); setEditingPrefecture(null) }}
          onSaved={() => { setShowPrefectureForm(false); setEditingPrefecture(null); fetchData() }}
        />
      )}
    </div>
  )
}
