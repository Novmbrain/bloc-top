import { S3Client } from '@aws-sdk/client-s3'

/**
 * Cloudflare R2 客户端 — 懒加载单例
 *
 * 从 api/upload 和 api/faces 提取的共享初始化逻辑。
 * 使用 S3 兼容 API 连接 R2，环境变量首次调用时校验。
 */
let s3Client: S3Client | null = null

export function getS3Client(): S3Client {
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
 * 获取 R2 bucket 名称，缺失时抛出错误
 */
export function getBucketName(): string {
  const bucketName = process.env.R2_BUCKET_NAME
  if (!bucketName) {
    throw new Error('Missing R2_BUCKET_NAME')
  }
  return bucketName
}
