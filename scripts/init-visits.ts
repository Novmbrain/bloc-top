/**
 * 初始化访问统计 Collection
 *
 * 使用方式:
 *   npx tsx scripts/init-visits.ts              # 开发环境
 *   npx tsx scripts/init-visits.ts production   # 生产环境
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

// 根据命令行参数加载对应环境变量
const env = process.argv[2] || 'development'
const envFile = env === 'production' ? '.env.production.local' : '.env.local'

console.log(`\n📦 加载环境配置: ${envFile}`)
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

const VISIT_STATS_ID = 'visit_stats'

async function initVisits() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME

  if (!uri) {
    console.error('❌ MONGODB_URI 环境变量未设置')
    process.exit(1)
  }

  if (!dbName) {
    console.error('❌ MONGODB_DB_NAME 环境变量未设置')
    process.exit(1)
  }

  console.log(`\n🔗 连接数据库...`)
  const client = new MongoClient(uri)

  try {
    await client.connect()
    const db = client.db(dbName)
    console.log(`✅ 已连接到数据库: ${db.databaseName}`)

    // 检查是否已存在
    const existing = await db.collection('visits').findOne({ _id: VISIT_STATS_ID as unknown as import('mongodb').Document['_id'] })

    if (existing) {
      console.log(`\n📊 visits collection 已存在，当前数据:`)
      console.log(`   - 总访问数: ${existing.total}`)
      console.log(`   - 省份数据: ${JSON.stringify(existing.provinces)}`)
      console.log(`   - 最后更新: ${existing.lastUpdated}`)
      console.log(`\n⚠️  跳过初始化（避免覆盖现有数据）`)
    } else {
      // 创建初始文档
      const initialDoc = {
        _id: VISIT_STATS_ID as unknown as import('mongodb').Document['_id'],
        provinces: {},
        total: 0,
        lastUpdated: new Date(),
      }

      await db.collection('visits').insertOne(initialDoc)
      console.log(`\n✅ visits collection 初始化成功!`)
      console.log(`   - 文档 ID: ${VISIT_STATS_ID}`)
      console.log(`   - 初始访问数: 0`)
    }

  } catch (error) {
    console.error('❌ 初始化失败:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log(`\n🔌 数据库连接已关闭`)
  }
}

initVisits()
