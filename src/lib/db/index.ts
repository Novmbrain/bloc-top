import { getDatabase } from '@/lib/mongodb'
import { createModuleLogger } from '@/lib/logger'
import type { Crag, Route, Feedback, VisitStats } from '@/types'
import type { WithId, Document } from 'mongodb'

// 创建数据库模块专用 logger
const log = createModuleLogger('DB')

// ============ 类型转换辅助函数 ============

/**
 * 将业务 ID 转换为 MongoDB _id 类型
 * MongoDB 原生驱动使用 _id: ObjectId，但本项目使用字符串/数字作为 _id
 */
function toMongoId(id: string | number): Document['_id'] {
  return id as Document['_id']
}

/**
 * 将 MongoDB 文档转换为 Crag 类型
 * MongoDB 使用 _id 作为主键，需要转换为业务 id
 */
function toCrag(doc: WithId<Document>): Crag {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, createdAt, updatedAt, ...rest } = doc
  return { id: _id as unknown as string, ...rest } as Crag
}

/**
 * 将 MongoDB 文档转换为 Route 类型
 */
function toRoute(doc: WithId<Document>): Route {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, createdAt, updatedAt, ...rest } = doc
  return { id: _id as unknown as number, ...rest } as Route
}


// ============ Crag 相关操作 ============

/**
 * 获取所有岩场
 */
export async function getAllCrags(): Promise<Crag[]> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const docs = await db
      .collection('crags')
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    log.info(`Fetched ${docs.length} crags`, {
      action: 'getAllCrags',
      duration: Date.now() - start,
    })

    return docs.map(toCrag)
  } catch (error) {
    log.error('Failed to fetch crags', error, {
      action: 'getAllCrags',
      duration: Date.now() - start,
    })
    throw error
  }
}

/**
 * 根据 ID 获取单个岩场
 */
export async function getCragById(id: string): Promise<Crag | null> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const doc = await db.collection('crags').findOne({ _id: toMongoId(id) })

    if (!doc) {
      log.info(`Crag not found: ${id}`, {
        action: 'getCragById',
        duration: Date.now() - start,
      })
      return null
    }

    log.debug(`Fetched crag: ${id}`, {
      action: 'getCragById',
      duration: Date.now() - start,
    })

    return toCrag(doc)
  } catch (error) {
    log.error(`Failed to fetch crag: ${id}`, error, {
      action: 'getCragById',
      duration: Date.now() - start,
      metadata: { cragId: id },
    })
    throw error
  }
}

// ============ Route 相关操作 ============

/**
 * 获取所有线路
 */
export async function getAllRoutes(): Promise<Route[]> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const docs = await db
      .collection('routes')
      .find({})
      .toArray()

    log.info(`Fetched ${docs.length} routes`, {
      action: 'getAllRoutes',
      duration: Date.now() - start,
    })

    return docs.map(toRoute)
  } catch (error) {
    log.error('Failed to fetch routes', error, {
      action: 'getAllRoutes',
      duration: Date.now() - start,
    })
    throw error
  }
}

/**
 * 根据 ID 获取单条线路
 */
export async function getRouteById(id: number): Promise<Route | null> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const doc = await db.collection('routes').findOne({ _id: toMongoId(id) })

    if (!doc) {
      log.info(`Route not found: ${id}`, {
        action: 'getRouteById',
        duration: Date.now() - start,
      })
      return null
    }

    log.debug(`Fetched route: ${id}`, {
      action: 'getRouteById',
      duration: Date.now() - start,
    })

    return toRoute(doc)
  } catch (error) {
    log.error(`Failed to fetch route: ${id}`, error, {
      action: 'getRouteById',
      duration: Date.now() - start,
      metadata: { routeId: id },
    })
    throw error
  }
}

/**
 * 获取指定岩场的所有线路
 */
export async function getRoutesByCragId(cragId: string): Promise<Route[]> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const docs = await db
      .collection('routes')
      .find({ cragId })
      .toArray()

    log.info(`Fetched ${docs.length} routes for crag: ${cragId}`, {
      action: 'getRoutesByCragId',
      duration: Date.now() - start,
      metadata: { cragId },
    })

    return docs.map(toRoute)
  } catch (error) {
    log.error(`Failed to fetch routes for crag: ${cragId}`, error, {
      action: 'getRoutesByCragId',
      duration: Date.now() - start,
      metadata: { cragId },
    })
    throw error
  }
}

/**
 * 更新线路信息
 * 支持部分更新，只更新传入的字段
 */
export async function updateRoute(
  id: number,
  updates: Partial<Omit<Route, 'id'>>
): Promise<Route | null> {
  const start = Date.now()

  try {
    const db = await getDatabase()

    // 添加更新时间戳
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    }

    const result = await db.collection('routes').findOneAndUpdate(
      { _id: toMongoId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) {
      log.info(`Route not found for update: ${id}`, {
        action: 'updateRoute',
        duration: Date.now() - start,
      })
      return null
    }

    log.info(`Updated route: ${id}`, {
      action: 'updateRoute',
      duration: Date.now() - start,
      metadata: { routeId: id, fields: Object.keys(updates) },
    })

    return toRoute(result)
  } catch (error) {
    log.error(`Failed to update route: ${id}`, error, {
      action: 'updateRoute',
      duration: Date.now() - start,
      metadata: { routeId: id },
    })
    throw error
  }
}

/**
 * 创建新线路
 * 自动生成递增 ID（取最大 _id + 1）
 */
export async function createRoute(
  data: Omit<Route, 'id' | 'topoLine' | 'betaLinks' | 'image'>
): Promise<Route> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const collection = db.collection('routes')

    // 获取最大 _id
    const lastDoc = await collection.find().sort({ _id: -1 }).limit(1).toArray()
    const newId = lastDoc.length > 0 ? (lastDoc[0]._id as unknown as number) + 1 : 1

    const doc = {
      _id: toMongoId(newId),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await collection.insertOne(doc)

    log.info(`Created route: ${newId}`, {
      action: 'createRoute',
      duration: Date.now() - start,
      metadata: { routeId: newId, name: data.name, cragId: data.cragId },
    })

    return { id: newId, ...data } as Route
  } catch (error) {
    log.error('Failed to create route', error, {
      action: 'createRoute',
      duration: Date.now() - start,
    })
    throw error
  }
}

/**
 * 更新岩场的区域列表
 */
export async function updateCragAreas(cragId: string, areas: string[]): Promise<string[]> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const result = await db.collection('crags').findOneAndUpdate(
      { _id: toMongoId(cragId) },
      { $set: { areas, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      log.info(`Crag not found for areas update: ${cragId}`, {
        action: 'updateCragAreas',
        duration: Date.now() - start,
      })
      return areas
    }

    log.info(`Updated crag areas: ${cragId}`, {
      action: 'updateCragAreas',
      duration: Date.now() - start,
      metadata: { cragId, areaCount: areas.length },
    })

    return (result.areas as string[]) || areas
  } catch (error) {
    log.error(`Failed to update crag areas: ${cragId}`, error, {
      action: 'updateCragAreas',
      duration: Date.now() - start,
      metadata: { cragId },
    })
    throw error
  }
}

// ============ Feedback 相关操作 ============

/**
 * 创建用户反馈
 */
export async function createFeedback(content: string): Promise<Feedback> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const doc = {
      content,
      createdAt: new Date(),
    }

    const result = await db.collection('feedbacks').insertOne(doc)

    log.info('Feedback created', {
      action: 'createFeedback',
      duration: Date.now() - start,
      metadata: { feedbackId: result.insertedId.toString() },
    })

    return {
      id: result.insertedId.toString(),
      content,
      createdAt: doc.createdAt,
    }
  } catch (error) {
    log.error('Failed to create feedback', error, {
      action: 'createFeedback',
      duration: Date.now() - start,
    })
    throw error
  }
}

// ============ Visit 相关操作 ============

const VISIT_STATS_ID = 'visit_stats'

/**
 * 记录一次 App 打开
 * 使用 $inc 原子操作更新省份计数和总数
 * 不去重，每次打开都会计数
 *
 * @param province 省份名称（如「福建省」、「海外」）
 */
export async function recordVisit(province: string): Promise<void> {
  const start = Date.now()

  try {
    const db = await getDatabase()

    // 使用 upsert + $inc 实现原子更新
    await db.collection('visits').updateOne(
      { _id: toMongoId(VISIT_STATS_ID) },
      {
        $inc: {
          [`provinces.${province}`]: 1,
          total: 1,
        },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true }
    )

    log.info(`Visit recorded: ${province}`, {
      action: 'recordVisit',
      duration: Date.now() - start,
      metadata: { province },
    })
  } catch (error) {
    log.error('Failed to record visit', error, {
      action: 'recordVisit',
      duration: Date.now() - start,
      metadata: { province },
    })
    throw error
  }
}

/**
 * 获取访问统计数据
 */
export async function getVisitStats(): Promise<VisitStats> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const doc = await db.collection('visits').findOne({
      _id: toMongoId(VISIT_STATS_ID),
    })

    if (!doc) {
      log.debug('No visit stats found, returning empty', {
        action: 'getVisitStats',
        duration: Date.now() - start,
      })
      return {
        provinces: {},
        total: 0,
        lastUpdated: new Date(),
      }
    }

    log.debug(`Fetched visit stats: ${doc.total} total visits`, {
      action: 'getVisitStats',
      duration: Date.now() - start,
    })

    return {
      provinces: doc.provinces || {},
      total: doc.total || 0,
      lastUpdated: doc.lastUpdated || new Date(),
    }
  } catch (error) {
    log.error('Failed to fetch visit stats', error, {
      action: 'getVisitStats',
      duration: Date.now() - start,
    })
    throw error
  }
}
