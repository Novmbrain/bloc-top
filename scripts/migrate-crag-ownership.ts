/**
 * RBAC Phase 1 迁移脚本
 *
 * 功能：
 * 1. 为所有现有岩场设置 createdBy (指向 admin 用户)
 * 2. 为 admin 创建所有岩场的 creator 权限记录
 * 3. 创建 crag_permissions 索引
 *
 * 使用方式:
 *   npx tsx scripts/migrate-crag-ownership.ts              # 开发环境
 *   npx tsx scripts/migrate-crag-ownership.ts production    # 生产环境
 *
 * 幂等：可安全重复执行，已存在的记录会被跳过
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

// 根据命令行参数加载对应环境变量
const env = process.argv[2] || 'development'
const envFile = env === 'production' ? '.env.production.local' : '.env.local'

console.log(`\n📦 加载环境配置: ${envFile}`)
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ 请设置 MONGODB_URI 环境变量')
  process.exit(1)
}

async function migrate() {
  const client = new MongoClient(MONGODB_URI!)
  await client.connect()
  const db = client.db()

  console.log('=== RBAC Phase 1: Crag Ownership Migration ===\n')

  // 1. 找到 admin 用户
  const adminUser = await db.collection('user').findOne({ role: 'admin' })
  if (!adminUser) {
    console.error('❌ 未找到 admin 用户 (user.role === "admin")')
    console.error('请确保至少有一个用户的 role 字段为 "admin"')
    await client.close()
    process.exit(1)
  }
  const adminId = adminUser._id.toString()
  console.log(`✅ 找到 admin 用户: ${adminUser.email} (${adminId})`)

  // 2. 为没有 createdBy 的岩场设置 createdBy
  const cragResult = await db.collection('crags').updateMany(
    { createdBy: { $exists: false } },
    {
      $set: {
        createdBy: adminId,
        updatedAt: new Date(),
      },
    }
  )
  console.log(`✅ 更新了 ${cragResult.modifiedCount} 个岩场的 createdBy`)

  // 3. 为 admin 创建 crag_permissions
  const crags = await db.collection('crags').find({}).toArray()
  console.log(`📊 共 ${crags.length} 个岩场`)

  let created = 0
  let skipped = 0
  for (const crag of crags) {
    const cragId = crag._id as unknown as string
    try {
      await db.collection('crag_permissions').insertOne({
        userId: adminId,
        cragId,
        role: 'creator',
        assignedBy: adminId,
        createdAt: new Date(),
      })
      created++
    } catch (err: unknown) {
      // 重复键错误 = 权限记录已存在，跳过
      if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
        skipped++
      } else {
        throw err
      }
    }
  }
  console.log(`✅ 创建了 ${created} 条权限记录 (跳过 ${skipped} 条已存在的)`)

  // 4. 创建索引
  await db.collection('crag_permissions').createIndex(
    { userId: 1, cragId: 1 },
    { unique: true }
  )
  await db.collection('crag_permissions').createIndex({ cragId: 1 })
  console.log('✅ 创建了 crag_permissions 索引')

  // 5. 验证
  const permCount = await db.collection('crag_permissions').countDocuments()
  const cragsWithCreatedBy = await db.collection('crags').countDocuments({
    createdBy: { $exists: true },
  })
  console.log(`\n=== 验证 ===`)
  console.log(`crag_permissions 记录数: ${permCount}`)
  console.log(`有 createdBy 的岩场数: ${cragsWithCreatedBy} / ${crags.length}`)
  console.log(`\n✅ 迁移完成！`)

  await client.close()
  process.exit(0)
}

migrate().catch(async err => {
  console.error('❌ 迁移失败:', err)
  process.exit(1)
})
