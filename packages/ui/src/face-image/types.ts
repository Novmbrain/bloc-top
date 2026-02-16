import type { Route } from '@bloctop/shared/types'

/**
 * Face key: 岩面图片的唯一标识
 * 格式: "cragId/area/faceId" 或 "cragId/routeName" (legacy)
 */
export type FaceKey = string

/**
 * 岩面图片源标识 (非 Route 场景使用)
 */
export interface FaceImageSource {
  cragId: string
  area: string
  faceId: string
}

/**
 * 可接受的图片源类型
 */
export type ImageSource = Route | FaceImageSource

/**
 * 图片加载状态
 */
export type FaceImageStatus = 'idle' | 'loading' | 'loaded' | 'error'

/**
 * useFaceImage hook 返回值
 */
export interface UseFaceImageResult {
  /** 图片 URL (无图片时为 null) */
  src: string | null
  /** 当前加载状态 */
  status: FaceImageStatus
  /** 是否加载中 */
  isLoading: boolean
  /** 是否加载失败 */
  isError: boolean
  /** 图片 onLoad 回调 (传给 <Image> 或 <img>) */
  onLoad: () => void
  /** 图片 onError 回调 (传给 <Image> 或 <img>) */
  onError: () => void
  /** 重试加载 */
  retry: () => void
}
