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

interface FaceInfo {
  faceId: string
  area: string
}

/**
 * GET /api/faces?cragId=xxx
 * 列出 R2 上指定岩场的所有岩面图片
 *
 * R2 路径结构: {cragId}/{area}/{faceId}.jpg
 *
 * 返回: { success: true, faces: FaceInfo[] }
 * 每个 FaceInfo 包含 faceId 和 area
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
    // 列出 {cragId}/ 下所有文件，解析 area/faceId 层级
    const prefix = `${cragId}/`
    const result = await getS3Client().send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    }))

    const faces: FaceInfo[] = []
    for (const obj of result.Contents || []) {
      if (!obj.Key) continue
      // Key 格式: {cragId}/{area}/{faceId}.jpg
      const relativePath = obj.Key.slice(prefix.length)
      if (!relativePath.endsWith('.jpg')) continue

      const parts = relativePath.split('/')
      // 需要至少 2 级: area/faceId.jpg
      if (parts.length !== 2) continue

      const area = parts[0]
      // 跳过旧的 faces/ 路径和其他非 area 目录
      if (area === 'faces') continue

      let faceId: string
      try {
        faceId = decodeURIComponent(parts[1].slice(0, -4))
      } catch {
        faceId = parts[1].slice(0, -4)
      }
      if (faceId) {
        faces.push({ faceId, area })
      }
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
