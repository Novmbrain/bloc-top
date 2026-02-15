import { MongoClient, Db } from 'mongodb'

// 环境变量校验
if (!process.env.MONGODB_URI) {
  throw new Error('请在环境变量中设置 MONGODB_URI')
}

if (!process.env.MONGODB_DB_NAME) {
  throw new Error('请在环境变量中设置 MONGODB_DB_NAME')
}

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB_NAME

// MongoDB 连接选项 - 针对 Vercel Serverless 优化
const options = {
  maxPoolSize: 10,       // Serverless 推荐值，防止连接过多
  minPoolSize: 1,
  maxIdleTimeMS: 60000,  // 60秒空闲超时
}

// 全局变量用于在开发模式下缓存连接
// 防止 HMR (Hot Module Replacement) 导致连接泄漏
declare global {
   
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // 开发模式: 使用全局变量缓存连接
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // 生产模式: 每个 Serverless 实例维护自己的连接
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

/**
 * 获取数据库实例
 * 用于服务端组件和 API Routes
 */
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise
  return client.db(dbName)
}

/**
 * 导出 clientPromise 供特殊场景使用
 * 例如: NextAuth.js 的 MongoDB Adapter
 */
export { clientPromise }
