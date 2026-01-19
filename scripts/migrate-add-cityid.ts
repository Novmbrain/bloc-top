/**
 * 数据迁移脚本：为现有岩场添加 cityId 字段
 *
 * 这是一个非破坏性迁移，只更新数据，不删除任何内容
 *
 * 使用方式:
 *   npx tsx scripts/migrate-add-cityid.ts           # 开发环境
 *   npx tsx scripts/migrate-add-cityid.ts production # 生产环境
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

// 根据命令行参数加载对应环境变量
const env = process.argv[2] || 'development'
const envFile = env === 'production' ? '.env.production.local' : '.env.local'

console.log(`\n📦 加载环境配置: ${envFile}`)
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

async function migrate() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME

  if (!uri || !dbName) {
    console.error('❌ 缺少环境变量 MONGODB_URI 或 MONGODB_DB_NAME')
    process.exit(1)
  }

  console.log(`\n🔗 正在连接到 ${env} 环境数据库: ${dbName}`)

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log('✓ 数据库连接成功')

    const db = client.db(dbName)

    // 检查当前状态
    console.log('\n🔍 检查当前数据状态...')
    const totalCrags = await db.collection('crags').countDocuments()
    const cragsWithCityId = await db.collection('crags').countDocuments({ cityId: { $exists: true } })
    const cragsWithoutCityId = totalCrags - cragsWithCityId

    console.log(`   总岩场数: ${totalCrags}`)
    console.log(`   已有 cityId: ${cragsWithCityId}`)
    console.log(`   缺少 cityId: ${cragsWithoutCityId}`)

    if (cragsWithoutCityId === 0) {
      console.log('\n✅ 所有岩场已有 cityId，无需迁移')
      return
    }

    // 执行迁移：为没有 cityId 的岩场添加默认值 'luoyuan'
    console.log('\n📝 开始迁移...')
    const result = await db.collection('crags').updateMany(
      { cityId: { $exists: false } },
      { $set: { cityId: 'luoyuan' } }
    )

    console.log(`✓ 已更新 ${result.modifiedCount} 个岩场`)

    // 验证结果
    console.log('\n🔍 验证迁移结果...')
    const afterMigration = await db.collection('crags').countDocuments({ cityId: { $exists: true } })
    console.log(`   已有 cityId 的岩场: ${afterMigration}/${totalCrags}`)

    console.log('\n✅ 迁移完成!\n')
  } catch (error) {
    console.error('\n❌ 迁移失败:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

migrate()
