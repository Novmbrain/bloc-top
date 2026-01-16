import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { detectPlatformFromUrl } from '@/lib/beta-constants'
import type { Document } from 'mongodb'

/**
 * POST /api/beta
 * 创建新的 Beta 链接
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { routeId, url, climberHeight, climberReach } = body

    // 验证必填字段
    if (!routeId || !url) {
      return NextResponse.json(
        { error: '缺少必填字段: routeId 和 url' },
        { status: 400 }
      )
    }

    // 验证 URL 格式
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: '无效的 URL 格式' },
        { status: 400 }
      )
    }

    // 验证身体数据范围（如果提供）
    if (climberHeight !== undefined && (climberHeight < 100 || climberHeight > 250)) {
      return NextResponse.json(
        { error: '身高应在 100-250 cm 之间' },
        { status: 400 }
      )
    }
    if (climberReach !== undefined && (climberReach < 100 || climberReach > 250)) {
      return NextResponse.json(
        { error: '臂长应在 100-250 cm 之间' },
        { status: 400 }
      )
    }

    const db = await getDatabase()

    // 检查线路是否存在
    const route = await db.collection('routes').findOne({ _id: routeId as unknown as Document['_id'] })
    if (!route) {
      return NextResponse.json(
        { error: '线路不存在' },
        { status: 404 }
      )
    }

    // 生成唯一 ID
    const betaId = `beta_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // 自动检测平台
    const platform = detectPlatformFromUrl(url)

    // 构建 BetaLink 对象
    const newBeta = {
      id: betaId,
      platform,
      url,
      ...(climberHeight && { climberHeight }),
      ...(climberReach && { climberReach }),
      createdAt: new Date(),
    }

    // 使用 $push 将新 Beta 添加到线路的 betaLinks 数组
    const result = await db.collection('routes').updateOne(
      { _id: routeId as unknown as Document['_id'] },
      {
        $push: { betaLinks: newBeta },
        $set: { updatedAt: new Date() }
      }
    )

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        beta: newBeta,
        message: 'Beta 分享成功'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建 Beta 失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/beta?routeId=123
 * 获取指定线路的所有 Beta
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const routeId = searchParams.get('routeId')

    if (!routeId) {
      return NextResponse.json(
        { error: '缺少 routeId 参数' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const routeIdNum = parseInt(routeId, 10)
    const route = await db.collection('routes').findOne(
      { _id: routeIdNum as unknown as Document['_id'] },
      { projection: { betaLinks: 1 } }
    )

    if (!route) {
      return NextResponse.json(
        { error: '线路不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      betaLinks: route.betaLinks || [],
    })
  } catch (error) {
    console.error('获取 Beta 失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
