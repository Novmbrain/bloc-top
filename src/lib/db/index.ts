import { getDatabase } from '@/lib/mongodb'
import type { Crag, Route } from '@/types'
import type { WithId, Document } from 'mongodb'

// ============ 类型转换辅助函数 ============

/**
 * 将 MongoDB 文档转换为 Crag 类型
 * MongoDB 使用 _id 作为主键，需要转换为业务 id
 */
function toCrag(doc: WithId<Document>): Crag {
  const { _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = doc
  return { id: _id as unknown as string, ...rest } as Crag
}

/**
 * 将 MongoDB 文档转换为 Route 类型
 */
function toRoute(doc: WithId<Document>): Route {
  const { _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = doc
  return { id: _id as unknown as number, ...rest } as Route
}

// ============ Crag 相关操作 ============

/**
 * 获取所有岩场
 */
export async function getAllCrags(): Promise<Crag[]> {
  const db = await getDatabase()
  const docs = await db
    .collection('crags')
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  return docs.map(toCrag)
}

/**
 * 根据 ID 获取单个岩场
 */
export async function getCragById(id: string): Promise<Crag | null> {
  const db = await getDatabase()
  const doc = await db.collection('crags').findOne({ _id: id as unknown as Document['_id'] })

  if (!doc) return null
  return toCrag(doc)
}

// ============ Route 相关操作 ============

/**
 * 获取所有线路
 */
export async function getAllRoutes(): Promise<Route[]> {
  const db = await getDatabase()
  const docs = await db
    .collection('routes')
    .find({})
    .toArray()

  return docs.map(toRoute)
}

/**
 * 根据 ID 获取单条线路
 */
export async function getRouteById(id: number): Promise<Route | null> {
  const db = await getDatabase()
  const doc = await db.collection('routes').findOne({ _id: id as unknown as Document['_id'] })

  if (!doc) return null
  return toRoute(doc)
}

/**
 * 获取指定岩场的所有线路
 */
export async function getRoutesByCragId(cragId: string): Promise<Route[]> {
  const db = await getDatabase()
  const docs = await db
    .collection('routes')
    .find({ cragId })
    .toArray()

  return docs.map(toRoute)
}
