import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Upload')

// 最大文件大小 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// 允许的图片类型
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// 懒加载 S3 客户端（R2 兼容）
let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing R2 configuration')
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }
  return s3Client
}

/**
 * 检查文件是否已存在于 R2
 * 使用 HeadObject 轻量级检查（不下载文件）
 */
async function checkFileExists(key: string): Promise<boolean> {
  const bucketName = process.env.R2_BUCKET_NAME
  if (!bucketName) return false

  try {
    await getS3Client().send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    }))
    return true
  } catch {
    // 404 或其他错误 = 文件不存在
    return false
  }
}

/**
 * POST /api/upload
 *
 * 上传图片到 Cloudflare R2
 *
 * FormData:
 * - file: File (图片文件，checkOnly 模式下可选)
 * - cragId: string (岩场 ID)
 * - routeName: string (线路名称)
 * - checkOnly: string (可选，设为 'true' 时只检查文件是否存在)
 *
 * 返回:
 * - success: boolean
 * - url: string (上传后的图片 URL，带时间戳用于缓存刷新)
 * - exists: boolean (checkOnly 模式下返回，表示文件是否已存在)
 */
export async function POST(request: NextRequest) {
  const start = Date.now()

  try {
    const formData = await request.formData()
    const cragId = formData.get('cragId') as string | null
    const routeName = formData.get('routeName') as string | null
    const faceId = formData.get('faceId') as string | null
    const area = formData.get('area') as string | null
    const checkOnly = formData.get('checkOnly') === 'true'

    // 验证必需参数：需要 cragId + (routeName 或 (faceId + area))
    if (!cragId || (!routeName && (!faceId || !area))) {
      return NextResponse.json(
        { success: false, error: '缺少岩场 ID 或线路名称/岩面信息' },
        { status: 400 }
      )
    }

    // 构建 R2 对象路径: {cragId}/{area}/{faceId}.jpg
    const key = (faceId && area)
      ? `${cragId}/${area}/${faceId}.jpg`
      : `${cragId}/${routeName!}.jpg`

    // ===== 检查模式：只检查文件是否存在 =====
    if (checkOnly) {
      const exists = await checkFileExists(key)
      return NextResponse.json({
        success: true,
        exists,
        key,
      })
    }

    // ===== 上传模式 =====
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: '缺少文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的图片格式，请上传 JPG/PNG/WebP' },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: '图片太大，请上传 5MB 以内的图片' },
        { status: 400 }
      )
    }

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer())

    // 上传到 R2
    const bucketName = process.env.R2_BUCKET_NAME
    if (!bucketName) {
      throw new Error('Missing R2_BUCKET_NAME')
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    })

    await getS3Client().send(command)

    // 构建公开访问 URL（带时间戳解决缓存问题）
    // 使用时间戳而非全局 IMAGE_VERSION，确保用户立即看到新上传的图片
    const imageUrl = `https://img.bouldering.top/${key}?t=${Date.now()}`

    log.info('Image uploaded successfully', {
      action: 'POST /api/upload',
      duration: Date.now() - start,
      metadata: { cragId, routeName, faceId, area, size: file.size },
    })

    return NextResponse.json({
      success: true,
      url: imageUrl,
      message: '图片上传成功',
    })
  } catch (error) {
    log.error('Failed to upload image', error, {
      action: 'POST /api/upload',
      duration: Date.now() - start,
    })

    // 检查是否是配置错误
    if (error instanceof Error && error.message.includes('Missing')) {
      return NextResponse.json(
        { success: false, error: 'R2 配置未设置，请联系管理员' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: '图片上传失败，请重试' },
      { status: 500 }
    )
  }
}
