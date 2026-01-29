import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Faces')

// 复用 upload 中相同的 S3 客户端初始化模式
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
 * GET /api/faces?cragId=xxx
 * 列出 R2 上指定岩场的所有岩面图片
 *
 * 返回: { success: true, faces: string[] }
 * faces 数组中的每个元素是 faceId（已解码）
 */
export async function GET(request: NextRequest) {
  const cragId = request.nextUrl.searchParams.get('cragId')

  if (!cragId) {
    return NextResponse.json(
      { success: false, error: '缺少 cragId 参数' },
      { status: 400 }
    )
  }

  const bucketName = process.env.R2_BUCKET_NAME
  if (!bucketName) {
    return NextResponse.json(
      { success: false, error: 'R2 配置未设置' },
      { status: 500 }
    )
  }

  try {
    const prefix = `${cragId}/faces/`
    const result = await getS3Client().send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    }))

    const faces: string[] = []
    for (const obj of result.Contents || []) {
      if (!obj.Key) continue
      // Key 格式: {cragId}/faces/{encodedFaceId}.jpg
      const filename = obj.Key.slice(prefix.length)
      if (!filename.endsWith('.jpg')) continue
      const faceId = decodeURIComponent(filename.slice(0, -4))
      if (faceId) faces.push(faceId)
    }

    return NextResponse.json({ success: true, faces })
  } catch (error) {
    log.error('Failed to list faces', error, {
      action: 'GET /api/faces',
      metadata: { cragId },
    })
    return NextResponse.json(
      { success: false, error: '获取岩面列表失败' },
      { status: 500 }
    )
  }
}
