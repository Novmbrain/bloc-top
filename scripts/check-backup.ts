/**
 * 检查备份数据库中 routes 是否有 topoLine 数据
 *
 * 使用方式:
 *   npx tsx scripts/check-backup.ts
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') })

const BACKUP_DB = 'luoyuan-topo-backup'
const PROD_DB = 'luoyuan-topo-prod'

async function check() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('❌ MONGODB_URI 未设置')
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()

    // 检查备份数据库
    console.log(`\n📋 检查备份数据库 [${BACKUP_DB}]:`)
    const backupDb = client.db(BACKUP_DB)
    const backupRoutes = await backupDb.collection('routes').find({}).toArray()
    console.log(`   总线路数: ${backupRoutes.length}`)

    const backupWithTopo = backupRoutes.filter(
      (r) => r.topoLine && Array.isArray(r.topoLine) && r.topoLine.length > 0
    )
    console.log(`   有 topoLine 的线路: ${backupWithTopo.length}`)

    const backupWithFaceId = backupRoutes.filter((r) => r.faceId)
    console.log(`   有 faceId 的线路: ${backupWithFaceId.length}`)

    const backupWithBeta = backupRoutes.filter(
      (r) => r.betaLinks && Array.isArray(r.betaLinks) && r.betaLinks.length > 0
    )
    console.log(`   有 betaLinks 的线路: ${backupWithBeta.length}`)

    if (backupWithTopo.length > 0) {
      console.log(`\n   ✅ 备份中有 topoLine 数据! 可以恢复`)
      console.log(`   示例线路:`)
      for (const r of backupWithTopo.slice(0, 5)) {
        console.log(`     - [${r._id}] ${r.name}: ${r.topoLine.length} 个点`)
      }
    } else {
      console.log(`\n   ❌ 备份中也没有 topoLine 数据`)
    }

    // 检查生产数据库
    console.log(`\n📋 检查生产数据库 [${PROD_DB}]:`)
    const prodDb = client.db(PROD_DB)
    const prodRoutes = await prodDb.collection('routes').find({}).toArray()
    console.log(`   总线路数: ${prodRoutes.length}`)

    const prodWithTopo = prodRoutes.filter(
      (r) => r.topoLine && Array.isArray(r.topoLine) && r.topoLine.length > 0
    )
    console.log(`   有 topoLine 的线路: ${prodWithTopo.length}`)

    const prodWithFaceId = prodRoutes.filter((r) => r.faceId)
    console.log(`   有 faceId 的线路: ${prodWithFaceId.length}`)

    const prodWithBeta = prodRoutes.filter(
      (r) => r.betaLinks && Array.isArray(r.betaLinks) && r.betaLinks.length > 0
    )
    console.log(`   有 betaLinks 的线路: ${prodWithBeta.length}`)

  } finally {
    await client.close()
    console.log('\n🔌 连接已关闭')
  }
}

check().catch(console.error)
