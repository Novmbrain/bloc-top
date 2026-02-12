/**
 * 数据库备份脚本
 * 将源数据库的所有集合完整复制到备份数据库
 *
 * 使用方式:
 *   npx tsx scripts/backup-db.ts                    # 开发环境
 *   npx tsx scripts/backup-db.ts production         # 生产环境
 */

import { MongoClient, Document } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

const env = process.argv[2] || 'development'
const envFile = env === 'production' ? '.env.production.local' : '.env.local'

console.log(`\n📦 加载环境配置: ${envFile}`)
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

const SOURCE_DB = 'luoyuan-topo-prod'
const BACKUP_DB = 'luoyuan-topo-backup'

async function backup() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    console.error('❌ 缺少环境变量 MONGODB_URI')
    process.exit(1)
  }

  console.log(`\n🔗 连接 MongoDB...`)
  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log('✓ 连接成功')

    const sourceDb = client.db(SOURCE_DB)
    const backupDb = client.db(BACKUP_DB)

    // 获取源数据库所有集合
    const collections = await sourceDb.listCollections().toArray()
    console.log(`\n📋 源数据库 [${SOURCE_DB}] 共 ${collections.length} 个集合:`)
    collections.forEach((c) => console.log(`   - ${c.name}`))

    // 逐个集合备份
    for (const collInfo of collections) {
      const collName = collInfo.name
      const sourceCol = sourceDb.collection(collName)
      const backupCol = backupDb.collection(collName)

      // 统计源文档数
      const count = await sourceCol.countDocuments()

      // 清空备份集合（避免重复）
      await backupCol.deleteMany({})

      if (count === 0) {
        console.log(`   ⏭️  ${collName}: 空集合，跳过`)
        continue
      }

      // 批量读取并写入
      const docs = await sourceCol.find({}).toArray()
      await backupCol.insertMany(docs as Document[])

      console.log(`   ✅ ${collName}: ${count} 条文档已备份`)
    }

    // 验证
    console.log(`\n🔍 验证备份...`)
    const backupCollections = await backupDb.listCollections().toArray()
    for (const collInfo of backupCollections) {
      const count = await backupDb.collection(collInfo.name).countDocuments()
      const sourceCount = await sourceDb.collection(collInfo.name).countDocuments()
      const status = count === sourceCount ? '✅' : '⚠️'
      console.log(`   ${status} ${collInfo.name}: 源 ${sourceCount} → 备份 ${count}`)
    }

    console.log(`\n✅ 备份完成: [${SOURCE_DB}] → [${BACKUP_DB}]`)
  } catch (error) {
    console.error('❌ 备份失败:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 数据库连接已关闭')
  }
}

backup()
