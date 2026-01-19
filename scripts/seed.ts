/**
 * 数据库迁移脚本
 * 将静态数据上传到 MongoDB
 *
 * 使用方式:
 *   npm run db:seed          # 开发环境
 *   npm run db:seed:prod     # 生产环境
 */

import { MongoClient, Document } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

// 根据命令行参数加载对应环境变量
const env = process.argv[2] || 'development'
const envFile = env === 'production' ? '.env.production.local' : '.env.local'

console.log(`\n📦 加载环境配置: ${envFile}`)
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

// 岩场数据
const crags = [
  {
    _id: 'yuan-tong-si',
    name: '圆通寺',
    cityId: 'luoyuan',
    location: '福建省福州市罗源县管柄村',
    developmentTime: '2019年4月',
    description:
      '岩场位于罗源县管柄村的圆通寺内，距县中心约五到十分钟车程，是罗源接近性最好的岩场之一。保护平台在寺庙和村民的支持与帮助下已被清理和休整，比较安全。1号石头需翻顶的线路要继续爬一段缓坡到巨石背面下来。周围绿植较多，夏季凉爽，但要注意防蚊虫。可借用寺庙的卫生间与洗池。由于所处环境特殊，请注意尊重相关文化，不要大声喧哗，一起维护寺庙与岩友间的良好关系。',
    approach:
      '高德地图导航至罗源圆通寺，进入村子后容易找到[管柄圆通寺]蓝色路牌，大胆拐进去，上坡，寺院门口有空地可以停车，沿阶梯穿过寺庙，步行2分钟即可到达圆通石。',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'ba-jing-cun',
    name: '八井村',
    cityId: 'luoyuan',
    location: '福建省福州市罗源县八井村',
    developmentTime: '2019年6月',
    description:
      '风景好，石头颜值高，晴天特别出片！午后太阳斜晒岩壁。离石头几米处有泉水（水源近期似乎被截走，后续会更新近况），度假区内有公共卫生间。晚饭可以就地在旁边饭馆吃饭（老板对岩友很友好）（人多建议提前下去安排杀鸡杀鸭炖汤）。',
    approach:
      '地图导航至畲乡里民宿，离县中心约十五分钟车程，车停在畲乡里民宿度假区停车场，上坡沿着土路步行约两三分钟到达。',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// 线路数据
const routes = [
  // 圆通寺线路
  { _id: 31, name: '不抢', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: '谢文辉', createdAt: new Date(), updatedAt: new Date() },
  { _id: 32, name: '半斤八两', grade: 'V2', cragId: 'yuan-tong-si', area: '圆通石', FA: '田仔', createdAt: new Date(), updatedAt: new Date() },
  { _id: 33, name: '艳阳天', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: '高忠渊', createdAt: new Date(), updatedAt: new Date() },
  { _id: 34, name: '黑爆', grade: 'V7', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Lee', createdAt: new Date(), updatedAt: new Date() },
  { _id: 35, name: '云外苍天', grade: 'V5', cragId: 'yuan-tong-si', area: '圆通石', FA: '小西 麻美', createdAt: new Date(), updatedAt: new Date() },
  { _id: 36, name: '清白之年', grade: 'V6', cragId: 'yuan-tong-si', area: '圆通石', FA: '郑斌', createdAt: new Date(), updatedAt: new Date() },
  { _id: 37, name: '风之谷', grade: 'V8', cragId: 'yuan-tong-si', area: '圆通石', FA: '久违', createdAt: new Date(), updatedAt: new Date() },
  { _id: 38, name: '野攀乐园', grade: 'V8', cragId: 'yuan-tong-si', area: '圆通石', FA: '老六', createdAt: new Date(), updatedAt: new Date() },
  { _id: 39, name: '晨钟暮鼓', grade: 'V5', cragId: 'yuan-tong-si', area: '圆通石', FA: '胡杨兮', createdAt: new Date(), updatedAt: new Date() },
  { _id: 40, name: '生日快乐', grade: 'V3', cragId: 'yuan-tong-si', area: '圆通石', FA: '虎妞', createdAt: new Date(), updatedAt: new Date() },
  { _id: 41, name: '打草惊蛇', grade: 'V3', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Fiona', createdAt: new Date(), updatedAt: new Date() },
  { _id: 42, name: '梦中繁星', grade: 'V3', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Fiona', createdAt: new Date(), updatedAt: new Date() },
  { _id: 43, name: '予汐', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: '曾俊文', createdAt: new Date(), updatedAt: new Date() },
  { _id: 44, name: '不争', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: '谢文辉', createdAt: new Date(), updatedAt: new Date() },
  { _id: 45, name: '威海离别信', grade: 'V9', cragId: 'yuan-tong-si', area: '圆通石', FA: '黄周文', createdAt: new Date(), updatedAt: new Date() },
  { _id: 46, name: '月光', grade: 'V9', cragId: 'yuan-tong-si', area: '圆通石', FA: '李诚', createdAt: new Date(), updatedAt: new Date() },
  { _id: 47, name: '红豆', grade: 'V10', cragId: 'yuan-tong-si', area: '圆通石', FA: '黄周文', createdAt: new Date(), updatedAt: new Date() },
  { _id: 48, name: '鱼你同行', grade: 'V3', cragId: 'yuan-tong-si', area: '圆通石', description: '挂脚起，线路左侧两个洞可用。', createdAt: new Date(), updatedAt: new Date() },
  { _id: 49, name: '热身线', grade: 'V1', cragId: 'yuan-tong-si', area: '圆通石', description: '裂缝并手起，脚点不限。', createdAt: new Date(), updatedAt: new Date() },
  { _id: 50, name: '鲸鲨', grade: 'V6', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Daluo', createdAt: new Date(), updatedAt: new Date() },
  { _id: 51, name: '年年有鱼', grade: 'V5', cragId: 'yuan-tong-si', area: '圆通石', FA: 'xiang', createdAt: new Date(), updatedAt: new Date() },
  { _id: 52, name: '鱼尔', grade: 'V2', cragId: 'yuan-tong-si', area: '圆通石', FA: '记录员BIN', createdAt: new Date(), updatedAt: new Date() },
  { _id: 53, name: '虎纠鱼丸', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Wenjie FU', createdAt: new Date(), updatedAt: new Date() },

  // 八井村线路
  { _id: 54, name: '草帽', grade: 'V2', cragId: 'ba-jing-cun', area: '罗源县八井村', createdAt: new Date(), updatedAt: new Date() },
  { _id: 55, name: '糟鳗也好吃', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '薛通劼', description: '坐起。', createdAt: new Date(), updatedAt: new Date() },
  { _id: 56, name: '畲风海韵', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', createdAt: new Date(), updatedAt: new Date() },
  { _id: 57, name: '绿野寻踪', grade: 'V5', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '胡杨兮', createdAt: new Date(), updatedAt: new Date() },
  { _id: 58, name: '罗源春天', grade: 'V5', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: 'dddragon', createdAt: new Date(), updatedAt: new Date() },
  { _id: 59, name: '柿子红了', grade: 'V6', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '谢文辉', createdAt: new Date(), updatedAt: new Date() },
  { _id: 60, name: 'B5', grade: 'V11', cragId: 'ba-jing-cun', area: '罗源县八井村', description: '【芭蕉绿了】起步手点改低，其余不变。', createdAt: new Date(), updatedAt: new Date() },
  { _id: 61, name: '芭蕉绿了', grade: 'V8', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '氧风', createdAt: new Date(), updatedAt: new Date() },
  { _id: 62, name: '小蜜蜂', grade: 'V7', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '李诚', createdAt: new Date(), updatedAt: new Date() },
  { _id: 63, name: '清泉石上', grade: 'V9', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '氧风', createdAt: new Date(), updatedAt: new Date() },
  { _id: 64, name: '八爪鱼', grade: 'V7', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '李诚', createdAt: new Date(), updatedAt: new Date() },
  { _id: 65, name: '赤脚大仙', grade: 'V6', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '郑斌', createdAt: new Date(), updatedAt: new Date() },
  { _id: 66, name: '赤脚大仙横移', grade: 'V6', cragId: 'ba-jing-cun', area: '罗源县八井村', description: '左手反提右手crimp，完成赤脚大仙后反爬C1，之后继续横移，可翻顶或跳下。', createdAt: new Date(), updatedAt: new Date() },
  { _id: 67, name: '鸭屎香', grade: 'V8', cragId: 'ba-jing-cun', area: '罗源县八井村', description: '两个大手点起步，向左横移翻顶。八井岩场回归首条新线，感谢村民们的支持，未来的日子也要跟鸭鸭、山羊和小蜜蜂一起快乐攀岩。', createdAt: new Date(), updatedAt: new Date() },
  { _id: 68, name: 'C1', grade: 'V5', cragId: 'ba-jing-cun', area: '罗源县八井村', createdAt: new Date(), updatedAt: new Date() },
  { _id: 69, name: '阳光下小憩', grade: 'V1', cragId: 'ba-jing-cun', area: '罗源县八井村', createdAt: new Date(), updatedAt: new Date() },
  { _id: 70, name: '小确幸', grade: 'V2', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '大了', createdAt: new Date(), updatedAt: new Date() },
  { _id: 71, name: '夏夜晚风', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: 'Singing', createdAt: new Date(), updatedAt: new Date() },
  { _id: 72, name: '心流', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', createdAt: new Date(), updatedAt: new Date() },
  { _id: 73, name: '清风策', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '高忠渊', createdAt: new Date(), updatedAt: new Date() },
  { _id: 74, name: '臭虫让个点', grade: 'V4', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '曾俊文', createdAt: new Date(), updatedAt: new Date() },
  { _id: 77, name: '单枪匹马', grade: 'V5', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '叶鹰英/Shannon组长啊', description: '反提点起步。', createdAt: new Date(), updatedAt: new Date() },
  { _id: 78, name: '向阳花', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '高忠渊', description: '反提点起步。', createdAt: new Date(), updatedAt: new Date() },
  { _id: 79, name: '海阔天空', grade: '？', cragId: 'ba-jing-cun', area: '罗源县八井村', createdAt: new Date(), updatedAt: new Date() },
]

async function seed() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME

  if (!uri || !dbName) {
    console.error('❌ 缺少环境变量 MONGODB_URI 或 MONGODB_DB_NAME')
    console.log('\n请确保 .env.local 文件存在并包含以下变量:')
    console.log('  MONGODB_URI=mongodb+srv://...')
    console.log('  MONGODB_DB_NAME=luoyuan-topo-dev')
    process.exit(1)
  }

  console.log(`\n🔗 正在连接到 ${env} 环境数据库: ${dbName}`)

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log('✓ 数据库连接成功')

    const db = client.db(dbName)

    // 清空现有数据
    console.log('\n🗑️  清空现有数据...')
    await db.collection('crags').deleteMany({})
    await db.collection('routes').deleteMany({})
    console.log('✓ 数据已清空')

    // 插入岩场数据
    console.log('\n📍 插入岩场数据...')
    const cragResult = await db.collection('crags').insertMany(crags as Document[])
    console.log(`✓ 插入 ${cragResult.insertedCount} 个岩场`)

    // 插入线路数据
    console.log('\n🧗 插入线路数据...')
    const routeResult = await db.collection('routes').insertMany(routes as Document[])
    console.log(`✓ 插入 ${routeResult.insertedCount} 条线路`)

    // 创建索引
    console.log('\n📇 创建索引...')
    await db.collection('crags').createIndex({ name: 1 })
    await db.collection('routes').createIndex({ cragId: 1 })
    await db.collection('routes').createIndex({ grade: 1 })
    console.log('✓ 索引创建完成')

    // 验证数据
    console.log('\n🔍 验证数据...')
    const cragCount = await db.collection('crags').countDocuments()
    const routeCount = await db.collection('routes').countDocuments()
    console.log(`   岩场: ${cragCount} 个`)
    console.log(`   线路: ${routeCount} 条`)

    console.log('\n✅ 数据迁移完成!\n')
  } catch (error) {
    console.error('\n❌ 迁移失败:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()
