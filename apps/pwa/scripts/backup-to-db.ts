/**
 * 数据库备份脚本：将生产数据复制到备份数据库
 *
 * 使用方式:
 *   npx tsx scripts/backup-to-db.ts
 *
 * 前提条件:
 *   .env.production.local 需要配置 MONGODB_URI
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

// 加载生产环境变量
const envFile = '.env.production.local'
console.log(`\n📦 加载环境配置: ${envFile}`)
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

// 配置
const SOURCE_DB = 'luoyuan-topo-prod'   // 源数据库（生产）
const BACKUP_DB = 'luoyuan-topo-backup' // 目标数据库（备份）
const COLLECTIONS = ['crags', 'routes'] // 需要备份的集合

async function backup() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    console.error('❌ 缺少环境变量 MONGODB_URI')
    console.log('\n请确保 .env.production.local 文件包含 MONGODB_URI')
    process.exit(1)
  }

  console.log(`\n🔗 正在连接到 MongoDB...`)
  console.log(`   源数据库: ${SOURCE_DB}`)
  console.log(`   备份数据库: ${BACKUP_DB}`)

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log('✓ 数据库连接成功')

    const sourceDb = client.db(SOURCE_DB)
    const backupDb = client.db(BACKUP_DB)

    // 备份每个集合
    for (const collectionName of COLLECTIONS) {
      console.log(`\n📋 备份集合: ${collectionName}`)

      // 读取源数据
      const documents = await sourceDb.collection(collectionName).find({}).toArray()
      console.log(`   读取 ${documents.length} 条记录`)

      if (documents.length === 0) {
        console.log(`   ⚠️ 源集合为空，跳过`)
        continue
      }

      // 清空目标集合
      await backupDb.collection(collectionName).deleteMany({})
      console.log(`   清空备份集合`)

      // 写入备份
      const result = await backupDb.collection(collectionName).insertMany(documents)
      console.log(`   ✓ 写入 ${result.insertedCount} 条记录`)
    }

    // 验证备份
    console.log('\n🔍 验证备份结果...')
    for (const collectionName of COLLECTIONS) {
      const sourceCount = await sourceDb.collection(collectionName).countDocuments()
      const backupCount = await backupDb.collection(collectionName).countDocuments()
      const status = sourceCount === backupCount ? '✓' : '❌'
      console.log(`   ${status} ${collectionName}: ${backupCount}/${sourceCount}`)
    }

    console.log('\n✅ 备份完成!\n')
    console.log(`💡 提示: 现在可以安全地运行生产迁移:`)
    console.log(`   npm run db:migrate:prod\n`)
  } catch (error) {
    console.error('\n❌ 备份失败:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

backup()
