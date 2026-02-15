/**
 * 插入 Beta 测试数据
 * 运行: npx tsx scripts/seed-beta.ts
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME

if (!MONGODB_URI) {
  console.error('错误: 请在 .env.local 中设置 MONGODB_URI')
  process.exit(1)
}

if (!MONGODB_DB_NAME) {
  console.error('错误: 请在 .env.local 中设置 MONGODB_DB_NAME')
  process.exit(1)
}

async function seedBetaData() {
  const client = new MongoClient(MONGODB_URI!)

  try {
    await client.connect()
    console.log('✅ 已连接到 MongoDB')
    console.log('📦 数据库名称:', MONGODB_DB_NAME)

    const db = client.db(MONGODB_DB_NAME)
    const routesCollection = db.collection('routes')

    // 测试数据：线路"云外苍天" (ID: 35)
    const testBeta = {
      id: `beta_${Date.now()}_test001`,
      platform: 'xiaohongshu' as const,
      url: 'http://xhslink.com/o/6L6IwtxYi13',
      climberHeight: 182,
      climberReach: 184,
      createdAt: new Date(),
    }

    // 更新线路，添加 Beta 数据
    const updateDoc = {
      $push: { betaLinks: testBeta },
      $set: { updatedAt: new Date() }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any // MongoDB 更新操作符类型断言

    const result = await routesCollection.updateOne(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _id: 35 as any }, // 云外苍天的 ID
      updateDoc
    )

    if (result.matchedCount === 0) {
      console.error('❌ 未找到线路 "云外苍天" (ID: 35)')
      return
    }

    if (result.modifiedCount > 0) {
      console.log('✅ Beta 测试数据插入成功!')
      console.log('   线路: 云外苍天 (ID: 35)')
      console.log('   链接:', testBeta.url)
      console.log('   身高:', testBeta.climberHeight, 'cm')
      console.log('   臂长:', testBeta.climberReach, 'cm')
    } else {
      console.log('⚠️  数据可能已存在，未做修改')
    }

    // 验证数据
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = await routesCollection.findOne({ _id: 35 as any })
    console.log('\n📋 当前 betaLinks:', JSON.stringify(route?.betaLinks, null, 2))

  } catch (error) {
    console.error('❌ 操作失败:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 已断开 MongoDB 连接')
  }
}

seedBetaData()
