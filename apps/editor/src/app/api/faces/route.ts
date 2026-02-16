import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3'
import { getDatabase } from '@bloctop/shared/mongodb'
import { requireAuth } from '@/lib/require-auth'
import { canEditCrag } from '@bloctop/shared/permissions'
import { createModuleLogger } from '@bloctop/shared/logger'
import { revalidateCragPages } from '@bloctop/shared/revalidate-helpers'

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
  // 认证 + 权限检查 (编辑器专用接口)
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  const cragId = request.nextUrl.searchParams.get('cragId')

  if (!cragId) {
    return NextResponse.json(
      { success: false, error: '缺少 cragId 参数' },
      { status: 400 }
    )
  }

  if (!(await canEditCrag(userId, cragId, role))) {
    return NextResponse.json(
      { success: false, error: '无权编辑此岩场' },
      { status: 403 }
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

/**
 * PATCH /api/faces
 * 重命名岩面：复制 R2 文件到新 key，删除旧文件，更新关联 routes 的 faceId
 *
 * Body: { cragId, area, oldFaceId, newFaceId }
 */
export async function PATCH(request: NextRequest) {
  const start = Date.now()

  // 认证检查
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  try {
    const { cragId, area, oldFaceId, newFaceId } = await request.json()

    if (!cragId || !area || !oldFaceId || !newFaceId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    if (oldFaceId === newFaceId) {
      return NextResponse.json(
        { success: false, error: '新旧名称相同' },
        { status: 400 }
      )
    }

    if (!/^[\u4e00-\u9fffa-z0-9-]+$/.test(newFaceId)) {
      return NextResponse.json(
        { success: false, error: '名称只允许中文、小写字母、数字和连字符' },
        { status: 400 }
      )
    }

    // 权限检查
    if (!(await canEditCrag(userId, cragId, role))) {
      return NextResponse.json(
        { success: false, error: '无权编辑此岩场' },
        { status: 403 }
      )
    }

    const bucketName = process.env.R2_BUCKET_NAME
    if (!bucketName) {
      return NextResponse.json(
        { success: false, error: 'R2 配置未设置' },
        { status: 500 }
      )
    }

    const client = getS3Client()
    const oldKey = `${cragId}/${area}/${oldFaceId}.jpg`
    const newKey = `${cragId}/${area}/${newFaceId}.jpg`

    // 1. 复制到新 key
    // CopySource 需要对 key 中的非 ASCII 字符进行 URI 编码
    const encodedOldKey = oldKey.split('/').map(s => encodeURIComponent(s)).join('/')
    await client.send(new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${encodedOldKey}`,
      Key: newKey,
      ContentType: 'image/jpeg',
    }))

    // 2. Copy 成功后，删除旧 key 和更新 DB 可并行执行
    const db = await getDatabase()
    const [, updateResult] = await Promise.all([
      client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: oldKey,
      })),
      db.collection('routes').updateMany(
        { cragId, faceId: oldFaceId },
        { $set: { faceId: newFaceId } }
      ),
    ])

    log.info('Face renamed', {
      action: 'PATCH /api/faces',
      duration: Date.now() - start,
      metadata: { cragId, area, oldFaceId, newFaceId, routesUpdated: updateResult.modifiedCount },
    })

    revalidateCragPages(cragId)

    return NextResponse.json({
      success: true,
      routesUpdated: updateResult.modifiedCount,
    })
  } catch (error) {
    log.error('Failed to rename face', error, {
      action: 'PATCH /api/faces',
      duration: Date.now() - start,
    })
    return NextResponse.json(
      { success: false, error: '重命名岩面失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/faces
 * 删除 R2 上的岩面图片，并清除关联 routes 的 faceId
 *
 * Body: { cragId, area, faceId }
 */
export async function DELETE(request: NextRequest) {
  const start = Date.now()

  // 认证检查
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  try {
    const { cragId, area, faceId } = await request.json()

    if (!cragId || !area || !faceId) {
      return NextResponse.json(
        { success: false, error: '缺少 cragId、area 或 faceId' },
        { status: 400 }
      )
    }

    // 权限检查
    if (!(await canEditCrag(userId, cragId, role))) {
      return NextResponse.json(
        { success: false, error: '无权编辑此岩场' },
        { status: 403 }
      )
    }

    const bucketName = process.env.R2_BUCKET_NAME
    if (!bucketName) {
      return NextResponse.json(
        { success: false, error: 'R2 配置未设置' },
        { status: 500 }
      )
    }

    // 1. 删除 R2 文件
    const key = `${cragId}/${area}/${faceId}.jpg`
    await getS3Client().send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }))

    // 2. 清除关联 routes 的 faceId 和 topoLine
    const db = await getDatabase()
    const updateResult = await db.collection('routes').updateMany(
      { cragId, faceId },
      { $unset: { faceId: '', topoLine: '' } }
    )

    log.info('Face deleted', {
      action: 'DELETE /api/faces',
      duration: Date.now() - start,
      metadata: { cragId, area, faceId, routesCleared: updateResult.modifiedCount },
    })

    revalidateCragPages(cragId)

    return NextResponse.json({
      success: true,
      routesCleared: updateResult.modifiedCount,
    })
  } catch (error) {
    log.error('Failed to delete face', error, {
      action: 'DELETE /api/faces',
      duration: Date.now() - start,
    })
    return NextResponse.json(
      { success: false, error: '删除岩面失败' },
      { status: 500 }
    )
  }
}
