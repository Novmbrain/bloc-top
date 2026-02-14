'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/i18n/navigation'
import {
  Mountain,
  Save,
  Loader2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { AppTabbar } from '@/components/app-tabbar'
import { useToast } from '@/components/ui/toast'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import { getCragCoverUrl } from '@/lib/constants'
import { pinyin } from 'pinyin-pro'
import { gcj02ToWgs84, truncateCoordinates } from '@/lib/coordinate-utils'
import type { Crag, Coordinates, CityConfig, PrefectureConfig } from '@/types'

// ==================== Slug 生成 ====================

/**
 * 将中文名称转换为 URL-safe 的 slug
 * 例: "圆通寺" → "yuan-tong-si"
 */
function generateSlug(name: string): string {
  return pinyin(name, { toneType: 'none', separator: '-' })
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ==================== 岩场编辑/创建页面 ====================

export default function CragEditPage() {
  useBreakAppShellLimit()

  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const rawId = params.id as string
  const isCreateMode = rawId === 'new'

  // ============ 表单状态 ============

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugManual, setIsSlugManual] = useState(false)
  const [cityId, setCityId] = useState('')
  const [isCustomCity, setIsCustomCity] = useState(false)
  const [customCityId, setCustomCityId] = useState('')
  const [location, setLocation] = useState('')
  const [lng, setLng] = useState('')
  const [lat, setLat] = useState('')
  const [coordSystem, setCoordSystem] = useState<'wgs84' | 'gcj02'>('wgs84')
  const [description, setDescription] = useState('')
  const [approach, setApproach] = useState('')
  const [coverImages, setCoverImages] = useState<string[]>([])

  // ============ 城市数据 ============

  const [cities, setCities] = useState<CityConfig[]>([])
  const [prefectures, setPrefectures] = useState<PrefectureConfig[]>([])

  // 加载城市配置
  useEffect(() => {
    fetch('/api/cities')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCities(data.cities)
          setPrefectures(data.prefectures)
        }
      })
      .catch(() => {})
  }, [])

  // ============ 加载/保存状态 ============

  const [isLoading, setIsLoading] = useState(!isCreateMode)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // ============ 数据加载 (编辑模式) ============

  useEffect(() => {
    if (isCreateMode) return

    async function fetchCrag() {
      try {
        const res = await fetch(`/api/crags/${rawId}`)
        const data = await res.json()
        if (!data.success || !data.crag) {
          showToast('岩场不存在', 'error')
          router.push('/editor/crags')
          return
        }

        const crag: Crag = data.crag
        setName(crag.name)
        setSlug(crag.id)
        // 如果 cityId 不在已知城市列表中，切换到自定义模式
        // 注意：cities 可能尚未加载完，先设 cityId，后续 cities 到位后 select 会自动匹配
        setCityId(crag.cityId)
        if (crag.cityId) {
          // 延迟检查是否需要切换到自定义模式
          fetch('/api/cities').then(r => r.json()).then(d => {
            if (d.success && !d.cities.some((c: CityConfig) => c.id === crag.cityId)) {
              setIsCustomCity(true)
              setCustomCityId(crag.cityId)
              setCityId('')
            }
          }).catch(() => {})
        }
        setLocation(crag.location)
        setDescription(crag.description)
        setApproach(crag.approach)
        if (crag.coordinates) {
          setLng(String(crag.coordinates.lng))
          setLat(String(crag.coordinates.lat))
        }
        if (crag.coverImages) {
          setCoverImages(crag.coverImages)
        }
      } catch {
        showToast('加载岩场数据失败', 'error')
        router.push('/editor/crags')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCrag()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首次加载
  }, [rawId, isCreateMode])

  // ============ 名称变更时自动生成 slug ============

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value)
      // 创建模式下，非手动编辑时自动生成 slug
      if (isCreateMode && !isSlugManual && value.trim()) {
        setSlug(generateSlug(value))
      }
    },
    [isCreateMode, isSlugManual]
  )

  // ============ 保存逻辑 ============

  const handleSave = useCallback(async () => {
    // 解析最终使用的 cityId
    const finalCityId = isCustomCity ? customCityId.trim() : cityId

    // 表单验证
    if (!name.trim()) {
      showToast('请输入岩场名称', 'error')
      return
    }
    if (isCreateMode && !slug.trim()) {
      showToast('请输入或生成岩场 ID', 'error')
      return
    }
    if (!finalCityId) {
      showToast(isCustomCity ? '请输入城市 ID' : '请选择所属城市', 'error')
      return
    }
    if (!location.trim()) {
      showToast('请输入地址描述', 'error')
      return
    }
    if (!description.trim()) {
      showToast('请输入岩场介绍', 'error')
      return
    }
    if (!approach.trim()) {
      showToast('请输入前往方式', 'error')
      return
    }

    // 构建坐标 (可选，DB 统一存 WGS-84)
    let coordinates: Coordinates | undefined
    if (lng && lat) {
      const lngNum = parseFloat(lng)
      const latNum = parseFloat(lat)
      if (!isNaN(lngNum) && !isNaN(latNum)) {
        let coords = { lng: lngNum, lat: latNum }
        if (coordSystem === 'gcj02') {
          coords = gcj02ToWgs84(coords)
        }
        coordinates = truncateCoordinates(coords)
      }
    }

    setIsSaving(true)

    try {
      if (isCreateMode) {
        // 创建模式: POST /api/crags
        const res = await fetch('/api/crags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: slug,
            name: name.trim(),
            cityId: finalCityId,
            location: location.trim(),
            description: description.trim(),
            approach: approach.trim(),
            ...(coordinates ? { coordinates } : {}),
          }),
        })

        const data = await res.json()
        if (!data.success) {
          showToast(data.error || '创建失败', 'error')
          return
        }

        showToast('岩场创建成功', 'success')
        router.push('/editor/crags')
      } else {
        // 编辑模式: PATCH /api/crags/{id}
        const updates: Record<string, unknown> = {
          name: name.trim(),
          cityId: finalCityId,
          location: location.trim(),
          description: description.trim(),
          approach: approach.trim(),
        }
        if (coordinates) {
          updates.coordinates = coordinates
        }

        const res = await fetch(`/api/crags/${rawId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })

        const data = await res.json()
        if (!data.success) {
          showToast(data.error || '更新失败', 'error')
          return
        }

        showToast('岩场更新成功', 'success')
        router.push('/editor/crags')
      }
    } catch {
      showToast('保存失败，请重试', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [
    name, slug, cityId, customCityId, isCustomCity, location, description, approach,
    lng, lat, isCreateMode, rawId, showToast, router,
  ])

  // ============ 封面图上传 ============

  const handleCoverUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)
        // R2 路径: CragSurface/{cragId}/0.jpg（单张封面，始终覆盖）
        formData.append('cragId', 'CragSurface')
        formData.append('routeName', `${rawId}/0`)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (!data.success) {
          showToast(data.error || '上传失败', 'error')
          return
        }

        // 单张封面：直接替换
        const newCoverImages = [data.url]
        setCoverImages(newCoverImages)

        // 同步更新到数据库
        const patchRes = await fetch(`/api/crags/${rawId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverImages: newCoverImages }),
        })

        const patchData = await patchRes.json()
        if (!patchData.success) {
          showToast('封面图上传成功，但更新数据库失败', 'error')
          return
        }

        showToast('封面图上传成功', 'success')
      } catch {
        showToast('上传失败，请重试', 'error')
      } finally {
        setIsUploading(false)
        // 清空 file input，允许重复上传同一文件
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [rawId, showToast]
  )

  // ============ 加载状态 ============

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--theme-surface)' }}
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: 'var(--theme-primary)' }}
        />
      </div>
    )
  }

  // ============ 城市列表 (编辑器显示全部城市) ============

  return (
    <div
      className="min-h-screen pb-20 lg:pb-0"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      {/* Header */}
      <EditorPageHeader
        title={isCreateMode ? '新建岩场' : '编辑岩场'}
        icon={
          <Mountain
            className="w-5 h-5"
            style={{ color: 'var(--theme-primary)' }}
          />
        }
        isDetailMode={false}
        onBackToList={() => router.push('/editor/crags')}
        listLabel="岩场列表"
      />

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ==================== 1. 基本信息 ==================== */}
        <div
          className="glass-light p-4 space-y-3"
          style={{
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          <h3
            className="font-semibold text-sm"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            基本信息
          </h3>

          {/* 名称 */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              名称 *
            </label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="例：圆通寺"
            />
          </div>

          {/* Slug 预览 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                ID (slug)
              </label>
              {isCreateMode && !isSlugManual && (
                <button
                  type="button"
                  onClick={() => setIsSlugManual(true)}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  编辑
                </button>
              )}
              {isCreateMode && isSlugManual && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSlugManual(false)
                    if (name.trim()) setSlug(generateSlug(name))
                  }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  自动生成
                </button>
              )}
            </div>

            {isCreateMode && isSlugManual ? (
              <Input
                value={slug}
                onChange={setSlug}
                placeholder="例：yuan-tong-si"
              />
            ) : (
              <div
                className="px-3 py-2.5 rounded-xl text-sm"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  color: slug
                    ? 'var(--theme-on-surface-variant)'
                    : 'color-mix(in srgb, var(--theme-on-surface-variant) 40%, transparent)',
                  opacity: isCreateMode ? 1 : 0.6,
                }}
              >
                {slug || '输入名称后自动生成'}
              </div>
            )}
          </div>

          {/* 所属城市 */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              所属城市 *
            </label>

            {!isCustomCity ? (
              <div className="space-y-2">
                <select
                  value={cityId}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '__custom__') {
                      setIsCustomCity(true)
                      setCityId('')
                    } else {
                      setCityId(val)
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    color: 'var(--theme-on-surface)',
                  }}
                >
                  <option value="">请选择城市</option>
                  {prefectures.length > 0
                    ? prefectures.map((pref) => (
                        <optgroup key={pref.id} label={pref.name}>
                          {pref.districts.map((districtId) => {
                            const city = cities.find((c) => c.id === districtId)
                            return city ? (
                              <option key={city.id} value={city.id}>
                                {city.name}
                              </option>
                            ) : null
                          })}
                        </optgroup>
                      ))
                    : cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))
                  }
                  <option value="__custom__">+ 新增城市...</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={customCityId}
                  onChange={setCustomCityId}
                  placeholder="城市 ID（如 fuqing、nanping）"
                />
                <p
                  className="text-xs"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  输入小写拼音作为城市标识符
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCity(false)
                    setCustomCityId('')
                  }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  返回选择已有城市
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==================== 2. 位置 ==================== */}
        <div
          className="glass-light p-4 space-y-3"
          style={{
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          <h3
            className="font-semibold text-sm"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            位置
          </h3>

          {/* 地址描述 */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              地址描述 *
            </label>
            <Input
              value={location}
              onChange={setLocation}
              placeholder="例：福州市罗源县飞竹镇"
            />
          </div>

          {/* 坐标系选择 */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              坐标系
            </label>
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
              {coordSystem === 'gcj02'
                ? '从高德坐标拾取器复制的坐标，保存时自动转为 WGS-84'
                : 'GPS 设备或国际地图的原始坐标，保留 6 位小数'}
            </p>
          </div>

          {/* 经纬度 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                经度
              </label>
              {/* eslint-disable-next-line no-restricted-syntax */}
              <input
                type="number"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="119.549000"
                step="0.000001"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  color: 'var(--theme-on-surface)',
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                纬度
              </label>
              {/* eslint-disable-next-line no-restricted-syntax */}
              <input
                type="number"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="26.489000"
                step="0.000001"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  color: 'var(--theme-on-surface)',
                }}
              />
            </div>
          </div>
        </div>

        {/* ==================== 3. 详情 ==================== */}
        <div
          className="glass-light p-4 space-y-3"
          style={{
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          <h3
            className="font-semibold text-sm"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            详情
          </h3>

          {/* 岩场介绍 */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              岩场介绍 *
            </label>
            <Textarea
              value={description}
              onChange={setDescription}
              placeholder="介绍岩场的地质特征、攀岩历史等"
              rows={4}
            />
          </div>

          {/* 前往方式 */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              前往方式 *
            </label>
            <Textarea
              value={approach}
              onChange={setApproach}
              placeholder="描述如何到达岩场，停车/步行路线等"
              rows={3}
            />
          </div>
        </div>

        {/* ==================== 4. 封面图管理 (仅编辑模式) ==================== */}
        {!isCreateMode && (
          <div
            className="glass-light p-4 space-y-3"
            style={{
              borderRadius: 'var(--theme-radius-xl)',
            }}
          >
            <h3
              className="font-semibold text-sm"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              封面图管理
            </h3>

            {/* 封面图预览（单张） */}
            {coverImages.length > 0 ? (
              <div
                className="relative aspect-[16/9] rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--theme-surface)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCragCoverUrl(rawId, 0)}
                  alt="封面图"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-8 rounded-xl"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  color: 'var(--theme-on-surface-variant)',
                }}
              >
                <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-sm">暂无封面图</span>
              </div>
            )}

            {/* 上传/更换按钮 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: 'var(--theme-surface)',
                color: 'var(--theme-primary)',
                border: '1px dashed var(--theme-outline-variant)',
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {coverImages.length > 0 ? '更换封面图' : '上传封面图'}
                </>
              )}
            </button>

            {/* 隐藏的 file input */}
            {/* eslint-disable-next-line no-restricted-syntax */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </div>
        )}

        {/* ==================== 保存按钮 ==================== */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
          }}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              保存
            </>
          )}
        </button>
      </div>

      {/* Mobile Tabbar */}
      <div className="lg:hidden">
        <AppTabbar />
      </div>
    </div>
  )
}
