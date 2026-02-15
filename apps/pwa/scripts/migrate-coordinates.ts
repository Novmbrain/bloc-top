/**
 * 坐标迁移脚本
 * 仅更新岩场的 coordinates 字段为 WGS-84 坐标，不修改或删除任何其他数据
 *
 * 使用方式:
 *   npx tsx scripts/migrate-coordinates.ts production
 */

import { MongoClient, Document } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

const env = process.argv[2] || 'development'
const envFile = env === 'production' ? '.env.production.local' : '.env.local'

console.log(`\n📦 加载环境配置: ${envFile}`)
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

// WGS-84 坐标（从原始 GCJ-02 硬编码值反算而来）
const CRAG_COORDINATES: Record<string, { lng: number; lat: number }> = {
  'yuan-tong-si': { lng: 119.520427, lat: 26.478648 },
  'ba-jing-cun': { lng: 119.550933, lat: 26.441836 },
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('❌ MONGODB_URI 未设置')
    process.exit(1)
  }

  const dbName = process.env.MONGODB_DB_NAME || (env === 'production' ? 'luoyuan-topo-prod' : 'luoyuan-topo-dev')
  console.log(`🗄️  目标数据库: ${dbName}`)

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)
    const crags = db.collection<Document & { _id: string }>('crags')

    // 先列出所有岩场的当前坐标状态
    const allCrags = await crags.find({}, { projection: { _id: 1, name: 1, coordinates: 1 } }).toArray()
    console.log(`\n📋 当前岩场坐标状态:`)
    for (const crag of allCrags) {
      const coords = crag.coordinates
        ? `(${crag.coordinates.lng}, ${crag.coordinates.lat})`
        : '❌ 无坐标'
      console.log(`   ${crag._id} (${crag.name}): ${coords}`)
    }

    // 逐个更新坐标
    console.log(`\n🔄 开始更新坐标...`)
    for (const [cragId, coords] of Object.entries(CRAG_COORDINATES)) {
      const result = await crags.updateOne(
        { _id: cragId },
        { $set: { coordinates: coords, updatedAt: new Date() } }
      )
      if (result.matchedCount === 0) {
        console.log(`   ⚠️  ${cragId}: 未找到，跳过`)
      } else if (result.modifiedCount === 0) {
        console.log(`   ✅ ${cragId}: 坐标已是最新，无需更新`)
      } else {
        console.log(`   ✅ ${cragId}: 已更新为 WGS-84 (${coords.lng}, ${coords.lat})`)
      }
    }

    // 验证
    console.log(`\n🔍 验证更新结果:`)
    const updated = await crags.find({}, { projection: { _id: 1, name: 1, coordinates: 1 } }).toArray()
    for (const crag of updated) {
      const coords = crag.coordinates
        ? `✅ (${crag.coordinates.lng}, ${crag.coordinates.lat})`
        : '❌ 无坐标'
      console.log(`   ${crag._id} (${crag.name}): ${coords}`)
    }

    console.log(`\n✅ 坐标迁移完成`)
  } finally {
    await client.close()
  }
}

main().catch(console.error)
