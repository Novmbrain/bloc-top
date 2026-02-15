/**
 * 检查数据库中的线路数据
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI

async function checkRoutes() {
  const client = new MongoClient(MONGODB_URI!)

  try {
    await client.connect()
    const db = client.db()

    // 查找包含"云外苍天"的线路
    const route = await db.collection('routes').findOne({ name: '云外苍天' })
    console.log('查找"云外苍天"结果:', route)

    // 列出前5条线路看看 ID 格式
    const routes = await db.collection('routes').find({}).limit(5).toArray()
    console.log('\n前5条线路:')
    routes.forEach(r => {
      console.log(`  _id: ${r._id} (${typeof r._id}), name: ${r.name}`)
    })

  } finally {
    await client.close()
  }
}

checkRoutes()
