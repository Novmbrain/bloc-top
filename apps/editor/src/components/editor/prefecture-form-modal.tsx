'use client'

import { useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { Input } from '@bloctop/ui/components/input'
import { useToast } from '@bloctop/ui/components/toast'
import type { PrefectureConfig } from '@bloctop/shared/types'
import { FormField } from '@/components/editor/form-field'

export function PrefectureFormModal({
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

      const { id: _omit, ...patchPayload } = payload
      const res = isEdit
        ? await fetch(`/api/prefectures/${prefecture.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patchPayload),
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
            {isEdit ? '编辑地级市' : '新建地级市'}
          </h3>
          <button onClick={onClose} className="p-1" aria-label="关闭">
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
