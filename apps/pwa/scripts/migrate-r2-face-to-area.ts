/**
 * 迁移 R2 岩面图片路径：从扁平结构改为按区域(area)分层
 *
 * 旧 Key: {cragId}/faces/{faceId}.jpg
 * 新 Key: {cragId}/{area}/{faceId}.jpg
 *
 * area 信息从 MongoDB routes 集合中根据 faceId 查找。
 * 如果某个 face 没有关联任何 route（孤儿 face），会跳过并报告。
 *
 * 用法:
 *   npx tsx scripts/migrate-r2-face-to-area.ts --dry-run   # 预览迁移
 *   npx tsx scripts/migrate-r2-face-to-area.ts              # 执行迁移
 */

import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const dryRun = process.argv.includes('--dry-run')

// ============ 环境变量 ============
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME
const mongoUri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB_NAME

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error('❌ Missing R2 env vars (CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)')
  process.exit(1)
}
if (!mongoUri || !dbName) {
  console.error('❌ Missing MongoDB env vars (MONGODB_URI, MONGODB_DB_NAME)')
  process.exit(1)
}

// ============ 初始化客户端 ============
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
})

async function migrate() {
  console.log(`\n🚀 R2 Face Migration: faces/ → area/ 层级结构`)
  console.log(`   模式: ${dryRun ? '🔍 DRY RUN（仅预览）' : '⚡ 执行迁移'}`)
  console.log('')

  // ============ 1. 从 MongoDB 构建 faceId → area 映射 ============
  console.log('📦 连接 MongoDB，构建 faceId → area 映射...')
  const mongo = new MongoClient(mongoUri!)
  await mongo.connect()
  const db = mongo.db(dbName)

  const routes = await db.collection('routes').find(
    { faceId: { $exists: true, $ne: null } },
    { projection: { faceId: 1, area: 1, cragId: 1 } }
  ).toArray()

  // faceId → { area, cragId }（取第一个匹配的 route）
  const faceAreaMap = new Map<string, { area: string; cragId: string }>()
  for (const r of routes) {
    if (r.faceId && r.area && !faceAreaMap.has(r.faceId)) {
      faceAreaMap.set(r.faceId, { area: r.area, cragId: r.cragId })
    }
  }
  console.log(`   找到 ${faceAreaMap.size} 个 faceId → area 映射\n`)

  // ============ 2. 列出 R2 中所有 */faces/*.jpg ============
  console.log('☁️  扫描 R2 中的 faces/ 文件...')
  const result = await s3.send(new ListObjectsV2Command({
    Bucket: bucketName,
  }))

  const objects = result.Contents || []
  const facesFiles = objects.filter(o => o.Key?.includes('/faces/') && o.Key?.endsWith('.jpg'))
  console.log(`   找到 ${facesFiles.length} 个 faces/ 文件\n`)

  // ============ 3. 逐个迁移 ============
  let migrated = 0
  let skipped = 0
  const orphans: string[] = []

  for (const obj of facesFiles) {
    const oldKey = obj.Key!
    // 解析: {cragId}/faces/{faceId}.jpg
    const match = oldKey.match(/^(.+?)\/faces\/(.+)\.jpg$/)
    if (!match) continue

    const cragId = match[1]
    let faceId: string
    try {
      faceId = decodeURIComponent(match[2])
    } catch {
      faceId = match[2]
    }

    // 查找 area
    const mapping = faceAreaMap.get(faceId)
    if (!mapping) {
      orphans.push(`${cragId}/faces/${faceId}.jpg`)
      skipped++
      continue
    }

    const newKey = `${cragId}/${mapping.area}/${faceId}.jpg`

    console.log(`${dryRun ? '[DRY RUN] ' : ''}📁 迁移:`)
    console.log(`   旧: ${oldKey}`)
    console.log(`   新: ${newKey}`)

    if (!dryRun) {
      // Copy → Delete（R2/S3 没有 rename）
      // CopySource 中的路径必须 URL 编码（HTTP header 不允许非 ASCII 字符）
      const encodedOldKey = oldKey.split('/').map(encodeURIComponent).join('/')
      await s3.send(new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${encodedOldKey}`,
        Key: newKey,
      }))
      await s3.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: oldKey,
      }))
      console.log('   ✅ 完成')
    }
    migrated++
  }

  // ============ 4. 报告 ============
  console.log('\n' + '═'.repeat(50))
  console.log(`📊 迁移报告 ${dryRun ? '(DRY RUN)' : ''}`)
  console.log(`   ✅ 迁移: ${migrated} 个文件`)
  console.log(`   ⏭️  跳过: ${skipped} 个文件`)

  if (orphans.length > 0) {
    console.log(`\n⚠️  以下 ${orphans.length} 个 face 没有关联 route，无法推断 area:`)
    orphans.forEach(f => console.log(`   - ${f}`))
    console.log('   请手动迁移这些文件，或先在编辑器中为对应线路关联 faceId。')
  }

  console.log('═'.repeat(50))

  await mongo.close()
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
