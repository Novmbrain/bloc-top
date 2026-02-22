/**
 * 图片裁剪工具
 * 纯 Canvas API，无 React 依赖
 */

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 从原图中裁剪指定区域并返回 Blob
 *
 * @param imageSrc - 图片 URL (支持 ObjectURL / data URL / HTTP URL)
 * @param cropPixels - 裁剪区域 (像素坐标)
 * @param maxSize - 输出最大边长 (默认 512px)
 * @returns WebP Blob (quality 0.85)
 */
export async function getCroppedBlob(
  imageSrc: string,
  cropPixels: CropArea,
  maxSize = 512
): Promise<Blob> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  // 输出尺寸：取裁剪区域和 maxSize 的较小值
  const outputSize = Math.min(cropPixels.width, cropPixels.height, maxSize)
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      },
      'image/webp',
      0.85
    )
  })
}
