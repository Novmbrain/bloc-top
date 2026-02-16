'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MapPin,
  Plus,
  Loader2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Input } from '@bloctop/ui/components/input'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { useToast } from '@bloctop/ui/components/toast'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import { gcj02ToWgs84, truncateCoordinates } from '@/lib/coordinate-utils'
import { useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import type { CityConfig, PrefectureConfig } from '@bloctop/shared/types'

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

  // 加载数据
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

  // 切换城市可用状态
  const toggleAvailable = async (city: CityConfig) => {
    const newAvailable = !city.available
    // Optimistic update
    setCities(prev => prev.map(c => c.id === city.id ? { ...c, available: newAvailable } : c))

    try {
      const res = await fetch(`/api/cities/${city.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: newAvailable }),
      })
      const data = await res.json()
      if (!data.success) {
        // Rollback
        setCities(prev => prev.map(c => c.id === city.id ? { ...c, available: !newAvailable } : c))
        showToast(data.error || '更新失败', 'error')
      }
    } catch {
      setCities(prev => prev.map(c => c.id === city.id ? { ...c, available: !newAvailable } : c))
      showToast('更新失败', 'error')
    }
  }

  if (loading || isSessionPending || userRole !== 'admin') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--theme-surface)' }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--theme-primary)' }} />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-20 lg:pb-0"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
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
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              地级市
            </h2>
            <button
              onClick={() => {
                setEditingPrefecture(null)
                setShowPrefectureForm(true)
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all active:scale-95"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
                color: 'var(--theme-primary)',
              }}
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          </div>

          {prefectures.map((pref) => (
            <div
              key={pref.id}
              className="glass-light p-4 mb-3"
              style={{ borderRadius: 'var(--theme-radius-xl)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span
                    className="font-semibold"
                    style={{ color: 'var(--theme-on-surface)' }}
                  >
                    {pref.name}
                  </span>
                  <span
                    className="text-xs ml-2"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    ({pref.id})
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingPrefecture(pref)
                    setShowPrefectureForm(true)
                  }}
                  className="text-xs font-medium"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  编辑
                </button>
              </div>

              <p
                className="text-xs"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                下辖: {pref.districts.join(', ')} · 默认: {pref.defaultDistrict}
              </p>
            </div>
          ))}
        </section>

        {/* ==================== 城市管理 ==================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              城市（区/县）
            </h2>
            <button
              onClick={() => {
                setEditingCity(null)
                setShowCityForm(true)
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all active:scale-95"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
                color: 'var(--theme-primary)',
              }}
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          </div>

          {/* 按地级市分组显示 */}
          {prefectures.map((pref) => {
            const prefCities = pref.districts
              .map((d) => cities.find((c) => c.id === d))
              .filter(Boolean) as CityConfig[]
            if (prefCities.length === 0) return null

            return (
              <div key={pref.id} className="mb-4">
                <h3
                  className="text-sm font-medium mb-2 px-1"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {pref.name}
                </h3>
                {prefCities.map((city) => (
                  <CityCard
                    key={city.id}
                    city={city}
                    onToggle={() => toggleAvailable(city)}
                    onEdit={() => {
                      setEditingCity(city)
                      setShowCityForm(true)
                    }}
                  />
                ))}
              </div>
            )
          })}

          {/* 未分组的城市 */}
          {(() => {
            const allDistricts = new Set(prefectures.flatMap((p) => p.districts))
            const ungrouped = cities.filter((c) => !allDistricts.has(c.id))
            if (ungrouped.length === 0) return null
            return (
              <div className="mb-4">
                <h3
                  className="text-sm font-medium mb-2 px-1"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  未分组
                </h3>
                {ungrouped.map((city) => (
                  <CityCard
                    key={city.id}
                    city={city}
                    onToggle={() => toggleAvailable(city)}
                    onEdit={() => {
                      setEditingCity(city)
                      setShowCityForm(true)
                    }}
                  />
                ))}
              </div>
            )
          })()}
        </section>
      </div>

      {/* 城市表单弹窗 */}
      {showCityForm && (
        <CityFormModal
          city={editingCity}
          prefectures={prefectures}
          onClose={() => {
            setShowCityForm(false)
            setEditingCity(null)
          }}
          onSaved={() => {
            setShowCityForm(false)
            setEditingCity(null)
            fetchData()
          }}
        />
      )}

      {/* 地级市表单弹窗 */}
      {showPrefectureForm && (
        <PrefectureFormModal
          prefecture={editingPrefecture}
          onClose={() => {
            setShowPrefectureForm(false)
            setEditingPrefecture(null)
          }}
          onSaved={() => {
            setShowPrefectureForm(false)
            setEditingPrefecture(null)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

// ==================== 城市卡片 ====================

function CityCard({
  city,
  onToggle,
  onEdit,
}: {
  city: CityConfig
  onToggle: () => void
  onEdit: () => void
}) {
  return (
    <div
      className="glass-light p-4 mb-2 flex items-center justify-between"
      style={{ borderRadius: 'var(--theme-radius-lg)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-medium"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {city.name}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {city.id}
          </span>
        </div>
        <p
          className="text-xs mt-0.5"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          adcode: {city.adcode} · ({city.coordinates.lng}, {city.coordinates.lat})
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggle}
          className="transition-colors"
          style={{ color: city.available ? 'var(--theme-success)' : 'var(--theme-on-surface-variant)' }}
        >
          {city.available ? (
            <ToggleRight className="w-6 h-6" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
        </button>
        <button
          onClick={onEdit}
          className="text-xs font-medium"
          style={{ color: 'var(--theme-primary)' }}
        >
          编辑
        </button>
      </div>
    </div>
  )
}

// ==================== 城市表单弹窗 ====================

function CityFormModal({
  city,
  prefectures,
  onClose,
  onSaved,
}: {
  city: CityConfig | null
  prefectures: PrefectureConfig[]
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const isEdit = !!city

  const [id, setId] = useState(city?.id ?? '')
  const [name, setName] = useState(city?.name ?? '')
  const [shortName, setShortName] = useState(city?.shortName ?? '')
  const [adcode, setAdcode] = useState(city?.adcode ?? '')
  const [lng, setLng] = useState(city?.coordinates.lng.toString() ?? '')
  const [lat, setLat] = useState(city?.coordinates.lat.toString() ?? '')
  const [coordSystem, setCoordSystem] = useState<'wgs84' | 'gcj02'>('wgs84')
  const [available, setAvailable] = useState(city?.available ?? false)
  const [prefectureId, setPrefectureId] = useState(city?.prefectureId ?? '')
  const [sortOrder, setSortOrder] = useState(city?.sortOrder?.toString() ?? '0')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!id || !name || !shortName || !adcode) {
      showToast('请填写必填字段', 'error')
      return
    }

    setSaving(true)
    try {
      // 坐标转换 + 精度截断 (DB 统一存 WGS-84)
      let coords = { lng: parseFloat(lng) || 0, lat: parseFloat(lat) || 0 }
      if (coordSystem === 'gcj02') {
        coords = gcj02ToWgs84(coords)
      }
      coords = truncateCoordinates(coords)

      const payload = {
        id,
        name,
        shortName,
        adcode,
        coordinates: coords,
        available,
        prefectureId: prefectureId || undefined,
        sortOrder: parseInt(sortOrder) || 0,
      }

      const res = isEdit
        ? await fetch(`/api/cities/${city.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await res.json()
      if (data.success) {
        showToast(isEdit ? '城市已更新' : '城市已创建', 'success')
        onSaved()
      } else {
        showToast(data.error || '保存失败', 'error')
      }
    } catch {
      showToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="glass-heavy w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 animate-drawer-in"
        style={{ borderRadius: 'var(--theme-radius-xl) var(--theme-radius-xl) 0 0' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-bold"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {isEdit ? '编辑城市' : '新建城市'}
          </h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
          </button>
        </div>

        <div className="space-y-3">
          <FormField label="ID *" disabled={isEdit}>
            <Input value={id} onChange={setId} placeholder="luoyuan" disabled={isEdit} />
          </FormField>
          <FormField label="名称 *">
            <Input value={name} onChange={setName} placeholder="罗源" />
          </FormField>
          <FormField label="简称 *">
            <Input value={shortName} onChange={setShortName} placeholder="罗源" />
          </FormField>
          <FormField label="高德 adcode *">
            <Input value={adcode} onChange={setAdcode} placeholder="350123" />
          </FormField>
          {/* 坐标系选择 */}
          <FormField label="坐标系">
            <div className="flex gap-2">
              {(['wgs84', 'gcj02'] as const).map((sys) => (
                <button
                  key={sys}
                  type="button"
                  onClick={() => setCoordSystem(sys)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: coordSystem === sys
                      ? 'color-mix(in srgb, var(--theme-primary) 20%, transparent)'
                      : 'var(--theme-surface)',
                    color: coordSystem === sys ? 'var(--theme-primary)' : 'var(--theme-on-surface-variant)',
                    border: coordSystem === sys ? '1px solid var(--theme-primary)' : '1px solid transparent',
                  }}
                >
                  {sys === 'wgs84' ? 'WGS-84 (GPS)' : 'GCJ-02 (高德)'}
                </button>
              ))}
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {coordSystem === 'gcj02' ? '从高德坐标拾取器复制的坐标，保存时自动转为 WGS-84' : 'GPS 设备或国际地图的原始坐标'}
            </p>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="经度">
              {/* eslint-disable-next-line no-restricted-syntax */}
              <input
                type="number"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="119.549000"
                step="0.000001"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
              />
            </FormField>
            <FormField label="纬度">
              {/* eslint-disable-next-line no-restricted-syntax */}
              <input
                type="number"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="26.489000"
                step="0.000001"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
              />
            </FormField>
          </div>
          <FormField label="所属地级市">
            <select
              value={prefectureId}
              onChange={(e) => setPrefectureId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
            >
              <option value="">无</option>
              {prefectures.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="排序">
              {/* eslint-disable-next-line no-restricted-syntax */}
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
              />
            </FormField>
            <FormField label="可用">
              <button
                onClick={() => setAvailable(!available)}
                className="flex items-center gap-2 px-3 py-2.5"
                style={{ color: available ? 'var(--theme-success)' : 'var(--theme-on-surface-variant)' }}
              >
                {available ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                <span className="text-sm">{available ? '已启用' : '未启用'}</span>
              </button>
            </FormField>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
          }}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}

// ==================== 地级市表单弹窗 ====================

function PrefectureFormModal({
  prefecture,
  onClose,
  onSaved,
}: {
  prefecture: PrefectureConfig | null
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const isEdit = !!prefecture

  const [id, setId] = useState(prefecture?.id ?? '')
  const [name, setName] = useState(prefecture?.name ?? '')
  const [shortName, setShortName] = useState(prefecture?.shortName ?? '')
  const [districts, setDistricts] = useState(prefecture?.districts.join(', ') ?? '')
  const [defaultDistrict, setDefaultDistrict] = useState(prefecture?.defaultDistrict ?? '')
  const [sortOrder, setSortOrder] = useState(prefecture?.sortOrder?.toString() ?? '0')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!id || !name || !shortName || !districts || !defaultDistrict) {
      showToast('请填写必填字段', 'error')
      return
    }

    setSaving(true)
    try {
      const districtsList = districts.split(',').map((d) => d.trim()).filter(Boolean)
      const payload = {
        id,
        name,
        shortName,
        districts: districtsList,
        defaultDistrict,
        sortOrder: parseInt(sortOrder) || 0,
      }

      const res = isEdit
        ? await fetch(`/api/prefectures/${prefecture.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/prefectures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await res.json()
      if (data.success) {
        showToast(isEdit ? '地级市已更新' : '地级市已创建', 'success')
        onSaved()
      } else {
        showToast(data.error || '保存失败', 'error')
      }
    } catch {
      showToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="glass-heavy w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 animate-drawer-in"
        style={{ borderRadius: 'var(--theme-radius-xl) var(--theme-radius-xl) 0 0' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-bold"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {isEdit ? '编辑地级市' : '新建地级市'}
          </h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
          </button>
        </div>

        <div className="space-y-3">
          <FormField label="ID *" disabled={isEdit}>
            <Input value={id} onChange={setId} placeholder="fuzhou" disabled={isEdit} />
          </FormField>
          <FormField label="名称 *">
            <Input value={name} onChange={setName} placeholder="福州" />
          </FormField>
          <FormField label="简称 *">
            <Input value={shortName} onChange={setShortName} placeholder="福州" />
          </FormField>
          <FormField label="下辖区/县 ID * (逗号分隔)">
            <Input value={districts} onChange={setDistricts} placeholder="luoyuan, changle" />
          </FormField>
          <FormField label="默认区/县 ID *">
            <Input value={defaultDistrict} onChange={setDefaultDistrict} placeholder="luoyuan" />
          </FormField>
          <FormField label="排序">
            {/* eslint-disable-next-line no-restricted-syntax */}
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
            />
          </FormField>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
          }}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}

// ==================== 通用表单字段 ====================

function FormField({
  label,
  children,
  disabled,
}: {
  label: string
  children: React.ReactNode
  disabled?: boolean
}) {
  void disabled
  return (
    <div>
      <label
        className="block text-xs font-medium mb-1.5"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
