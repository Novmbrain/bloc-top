import { getDatabase } from '@/lib/mongodb'
import { createModuleLogger } from '@/lib/logger'
import type { Crag, Route, Feedback } from '@/types'
import type { WithId, Document } from 'mongodb'

// 创建数据库模块专用 logger
const log = createModuleLogger('DB')

// ============ 类型转换辅助函数 ============

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
    const doc = await db.collection('crags').findOne({ _id: id as unknown as Document['_id'] })

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
    const doc = await db.collection('routes').findOne({ _id: id as unknown as Document['_id'] })

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
