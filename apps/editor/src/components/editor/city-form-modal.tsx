'use client'

import { useState } from 'react'
import { Loader2, Save, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { Input } from '@bloctop/ui/components/input'
import { useToast } from '@bloctop/ui/components/toast'
import { parseCoordinateInput, truncateCoordinates, formatCoordinateDisplay } from '@bloctop/shared/coordinate-utils'
import type { CityConfig, PrefectureConfig } from '@bloctop/shared/types'
import { FormField } from '@/components/editor/form-field'

export function CityFormModal({
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
  const [coordinateInput, setCoordinateInput] = useState(city ? formatCoordinateDisplay(city.coordinates) : '')
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
      const coords = parseCoordinateInput(coordinateInput)
      if (!coords) {
        showToast('坐标格式无效，请从高德拾取器粘贴', 'error')
        setSaving(false)
        return
      }
      const truncated = truncateCoordinates(coords)

      const payload = {
        id,
        name,
        shortName,
        adcode,
        coordinates: truncated,
        available,
        prefectureId: prefectureId || undefined,
        sortOrder: parseInt(sortOrder) || 0,
      }

      const { id: _omit, ...patchPayload } = payload
      const res = isEdit
        ? await fetch(`/api/cities/${city.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patchPayload),
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
      style={{ backgroundColor: 'color-mix(in srgb, black 40%, transparent)' }}
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
          <button onClick={onClose} className="p-1" aria-label="关闭">
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
          <FormField label="坐标 (GCJ-02)">
            <Input
              value={coordinateInput}
              onChange={setCoordinateInput}
              placeholder="119.306239,26.063477"
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--theme-on-surface-variant)' }}>
              从<a href="https://lbs.amap.com/tools/picker" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--theme-primary)' }}>高德坐标拾取器</a>复制坐标粘贴
            </p>
          </FormField>
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
