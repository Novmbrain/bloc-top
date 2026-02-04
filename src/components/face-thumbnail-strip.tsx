'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Image as ImageIcon } from 'lucide-react'
import { useFaceImageCache } from '@/hooks/use-face-image'

interface FaceGroup {
  key: string
  label: string
  image: string
}

interface FaceThumbnailStripProps {
  selectedCrag: string
  selectedFace: string | null
  onFaceSelect: (faceId: string | null) => void
}

/**
 * 岩面缩略图 - 独立管理加载/错误状态
 *
 * 设计决策: src 变化时不重置 status。
 * 浏览器原生 <img> 在 src 变化时保持显示旧图直到新图加载完成,
 * 对缩略图来说这是更好的 UX (避免多个缩略图同时闪烁 skeleton)。
 * 新图加载成功 → onLoad → 'loaded'; 失败 → onError → 'error'。
 */
const FaceThumbnail = memo(function FaceThumbnail({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <>
      {status === 'loading' && (
        <div className="w-full h-full skeleton-shimmer" />
      )}
      {status === 'error' && (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          <ImageIcon className="w-4 h-4 opacity-40" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${status === 'loaded' ? '' : 'hidden'}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </>
  )
})

/**
 * 岩面缩略图横向滑动组件
 * 选中某个岩场后，从 API 获取 R2 上实际存在的岩面图片列表
 */
export const FaceThumbnailStrip = memo(function FaceThumbnailStrip({
  selectedCrag,
  selectedFace,
  onFaceSelect,
}: FaceThumbnailStripProps) {
  const tCommon = useTranslations('Common')
  const cache = useFaceImageCache()
  // 递增值用于强制 useMemo 重算 (缓存失效时触发)
  const [cacheVersion, setCacheVersion] = useState(0)

  // 订阅当前岩场下所有岩面的缓存失效事件
  useEffect(() => {
    if (!selectedCrag) return
    return cache.subscribeByPrefix(`${selectedCrag}/`, () => {
      setCacheVersion(v => v + 1)
    })
  }, [selectedCrag, cache])

  // 从 API 获取 R2 上真实存在的 face 列表
  // 用 { cragId, faces } 单一状态避免 effect 内同步 setState
  const [facesState, setFacesState] = useState<{
    cragId: string
    faces: { faceId: string; area: string }[]
    loading: boolean
  }>({ cragId: '', faces: [], loading: false })

  useEffect(() => {
    if (!selectedCrag) return

    let cancelled = false

    fetch(`/api/faces?cragId=${encodeURIComponent(selectedCrag)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setFacesState({ cragId: selectedCrag, faces: data.faces, loading: false })
        }
      })
      .catch(() => {
        if (!cancelled) setFacesState({ cragId: selectedCrag, faces: [], loading: false })
      })

    return () => { cancelled = true }
  }, [selectedCrag])

  // 派生状态：crag 不匹配时视为 loading
  const r2Faces = facesState.cragId === selectedCrag ? facesState.faces : []
  const loading = selectedCrag !== '' && facesState.cragId !== selectedCrag

  // 基于 API 数据生成 face groups (通过缓存层获取版本感知的 URL)
  // cacheVersion 变化时强制重算 → 获取带新时间戳的 URL
  const faceGroups = useMemo<FaceGroup[]>(() => {
    return r2Faces.map(({ faceId, area }) => ({
      key: faceId,
      label: area,
      image: cache.getImageUrl({ cragId: selectedCrag, area, faceId }),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cacheVersion is an intentional trigger dep for cache invalidation
  }, [r2Faces, selectedCrag, cache, cacheVersion])

  const handleAllClick = useCallback(() => onFaceSelect(null), [onFaceSelect])
  const handleFaceClick = useCallback(
    (key: string) => onFaceSelect(selectedFace === key ? null : key),
    [onFaceSelect, selectedFace]
  )

  if (!selectedCrag) return null

  // 加载中显示 skeleton strip
  if (loading && faceGroups.length === 0) {
    return (
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 px-4 pb-2" style={{ minWidth: 'min-content' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div
                className="w-16 h-12 skeleton-shimmer"
                style={{ borderRadius: 'var(--theme-radius-md)' }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (faceGroups.length === 0) return null

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-4 pb-2" style={{ minWidth: 'min-content' }}>
        {/* "全部" 选项 */}
        <button
          onClick={handleAllClick}
          className="flex-shrink-0 flex flex-col items-center gap-1 transition-all active:scale-95"
        >
          <div
            className="w-16 h-12 flex items-center justify-center text-xs font-medium"
            style={{
              borderRadius: 'var(--theme-radius-md)',
              backgroundColor: !selectedFace
                ? 'var(--theme-primary)'
                : 'var(--theme-surface-variant)',
              color: !selectedFace
                ? 'var(--theme-on-primary)'
                : 'var(--theme-on-surface-variant)',
              border: !selectedFace
                ? '2px solid var(--theme-primary)'
                : '2px solid transparent',
            }}
          >
            {tCommon('all')}
          </div>
        </button>

        {faceGroups.map((group) => {
          const isSelected = selectedFace === group.key
          return (
            <button
              key={group.key}
              onClick={() => handleFaceClick(group.key)}
              className="flex-shrink-0 flex flex-col items-center gap-1 transition-all active:scale-95"
            >
              <div
                className="w-16 h-12 overflow-hidden"
                style={{
                  borderRadius: 'var(--theme-radius-md)',
                  border: isSelected
                    ? '2px solid var(--theme-primary)'
                    : '2px solid transparent',
                }}
              >
                <FaceThumbnail src={group.image} alt={group.label} />
              </div>
              <span
                className="text-xs max-w-16 truncate"
                style={{
                  color: isSelected
                    ? 'var(--theme-primary)'
                    : 'var(--theme-on-surface-variant)',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {group.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
})
