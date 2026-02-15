/**
 * 迁移 R2 中双重编码的 face 图片 Key
 *
 * 旧 Key: {cragId}/faces/%E5%9C%86%E9%80%9A%E7%9F%B3-%E6%AD%A3%E9%9D%A2.jpg
 * 新 Key: {cragId}/faces/圆通石-正面.jpg
 *
 * Cloudflare 公共域名会自动 URL-decode 路径，所以 R2 Key 应存储原始字符。
 *
 * 用法: npx tsx scripts/migrate-r2-face-keys.ts [--dry-run]
 */

import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const dryRun = process.argv.includes('--dry-run')

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error('Missing R2 env vars')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
})

async function migrate() {
  // List all objects under */faces/
  const result = await s3.send(new ListObjectsV2Command({
    Bucket: bucketName,
    Delimiter: '',
  }))

  const objects = result.Contents || []
  let migrated = 0

  for (const obj of objects) {
    const key = obj.Key
    if (!key || !key.includes('/faces/')) continue

    // Check if key contains percent-encoded sequences (double-encoded)
    if (!/%[0-9A-Fa-f]{2}/.test(key)) continue

    // Decode to get the correct key
    const newKey = decodeURIComponent(key)
    if (newKey === key) continue

    console.log(`${dryRun ? '[DRY RUN] ' : ''}Migrate:`)
    console.log(`  OLD: ${key}`)
    console.log(`  NEW: ${newKey}`)

    if (!dryRun) {
      // Copy to new key (CopySource must be URI-encoded)
      await s3.send(new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${encodeURIComponent(key)}`,
        Key: newKey,
      }))
      // Delete old key
      await s3.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }))
      console.log('  ✅ Done')
    }
    migrated++
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Total: ${migrated} files migrated`)
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
