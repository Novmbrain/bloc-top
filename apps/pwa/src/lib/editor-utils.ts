// viewBox 尺寸 (与 Demo 页面保持一致)
export const VIEW_WIDTH = 400
export const VIEW_HEIGHT = 300

// 难度选项
export const GRADE_OPTIONS = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7',
  'V8', 'V9', 'V10', 'V11', 'V12', 'V13', '？'
]

/**
 * 预加载图片并验证可访问（带重试，应对 CDN 传播延迟）
 */
export function preloadImage(url: string): Promise<void> {
  const attempt = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = url
    })

  return attempt().catch(() =>
    new Promise(r => setTimeout(r, 1500)).then(() => attempt())
  ).catch(() =>
    new Promise(r => setTimeout(r, 3000)).then(() => attempt())
  )
}
