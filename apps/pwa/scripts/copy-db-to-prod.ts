/**
 * 将开发数据库数据复制到生产数据库
 *
 * 用法:
 *   npx tsx scripts/copy-db-to-prod.ts
 *
 * 此脚本会：
 * 1. 连接到 MongoDB Atlas
 * 2. 从 luoyuan-topo-dev 读取所有数据
 * 3. 创建 luoyuan-topo-prod 并写入数据
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'
import * as readline from 'readline'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ 错误: 请在 .env.local 中设置 MONGODB_URI')
  process.exit(1)
}

const DEV_DB_NAME = 'luoyuan-topo-dev'
const PROD_DB_NAME = 'luoyuan-topo-prod'

// 需要复制的集合
const COLLECTIONS_TO_COPY = ['crags', 'routes']

async function confirmAction(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(
      `\n⚠️  警告: 此操作将把 ${DEV_DB_NAME} 的数据复制到 ${PROD_DB_NAME}\n` +
        `   如果 ${PROD_DB_NAME} 已存在数据，将会被覆盖！\n\n` +
        `   确定要继续吗？(y/N): `,
      (answer) => {
        rl.close()
        resolve(answer.toLowerCase() === 'y')
      }
    )
  })
}

async function copyDatabase() {
  console.log('\n📦 MongoDB 数据库复制工具')
  console.log('━'.repeat(50))

  // 确认操作
  const confirmed = await confirmAction()
  if (!confirmed) {
    console.log('\n❌ 操作已取消')
    process.exit(0)
  }

  const client = new MongoClient(MONGODB_URI!)

  try {
    console.log('\n🔗 连接到 MongoDB Atlas...')
    await client.connect()
    console.log('✅ 连接成功')

    const devDb = client.db(DEV_DB_NAME)
    const prodDb = client.db(PROD_DB_NAME)

    // 检查开发数据库
    const devCollections = await devDb.listCollections().toArray()
    console.log(`\n📊 开发数据库 (${DEV_DB_NAME}) 集合:`)
    devCollections.forEach((col) => console.log(`   - ${col.name}`))

    // 复制每个集合
    for (const collectionName of COLLECTIONS_TO_COPY) {
      console.log(`\n📋 复制集合: ${collectionName}`)

      const devCollection = devDb.collection(collectionName)
      const prodCollection = prodDb.collection(collectionName)

      // 获取开发环境数据
      const documents = await devCollection.find({}).toArray()
      console.log(`   找到 ${documents.length} 条文档`)

      if (documents.length === 0) {
        console.log(`   ⚠️  集合为空，跳过`)
        continue
      }

      // 清空生产环境集合（如果存在）
      try {
        await prodCollection.drop()
        console.log(`   🗑️  已清空生产环境集合`)
      } catch {
        // 集合不存在，忽略错误
        console.log(`   ℹ️  生产环境集合不存在，将创建新集合`)
      }

      // 插入数据到生产环境
      const result = await prodCollection.insertMany(documents)
      console.log(`   ✅ 已复制 ${result.insertedCount} 条文档到 ${PROD_DB_NAME}`)
    }

    // 验证结果
    console.log('\n━'.repeat(50))
    console.log('🔍 验证生产数据库:')
    const prodCollections = await prodDb.listCollections().toArray()
    for (const col of prodCollections) {
      const count = await prodDb.collection(col.name).countDocuments()
      console.log(`   ${col.name}: ${count} 条文档`)
    }

    console.log('\n✅ 数据库复制完成！')
    console.log('\n📝 下一步:')
    console.log('   1. 在 Vercel 项目设置中添加生产环境变量:')
    console.log(`      MONGODB_DB_NAME = ${PROD_DB_NAME}`)
    console.log('   2. 重新部署项目')
  } catch (error) {
    console.error('\n❌ 复制失败:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 已断开数据库连接')
  }
}

copyDatabase()
