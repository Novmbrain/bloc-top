/**
 * 数据库迁移脚本：为 crags 集合的 cityId 字段创建索引
 *
 * MongoDB 会自动跳过已存在的索引，所以此脚本可安全重复执行
 *
 * 使用方式:
 *   npx tsx scripts/migrate-cityid-index.ts           # 开发环境
 *   npx tsx scripts/migrate-cityid-index.ts production # 生产环境
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

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

    // 创建 crags.cityId 索引
    console.log('\n📝 创建 crags.cityId 索引...')
    const indexName = await db.collection('crags').createIndex(
      { cityId: 1 },
      { name: 'idx_cityId', background: true }
    )
    console.log(`✓ 索引创建成功: ${indexName}`)

    // 列出所有索引
    console.log('\n📋 crags 集合当前索引:')
    const indexes = await db.collection('crags').indexes()
    indexes.forEach((idx) => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`)
    })

    console.log('\n✅ 迁移完成!\n')
  } catch (error) {
    console.error('\n❌ 迁移失败:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

migrate()
