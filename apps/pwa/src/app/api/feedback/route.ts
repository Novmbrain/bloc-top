import { NextRequest, NextResponse } from 'next/server'
import { createFeedback } from '@/lib/db'
import { createModuleLogger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'

const log = createModuleLogger('Feedback')

/**
 * POST /api/feedback
 * 提交用户反馈留言
 */
export async function POST(request: NextRequest) {
  const start = Date.now()
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  try {
    // Rate limiting: 每 IP 每分钟最多 3 次
    const rateCheck = checkRateLimit(ip, { maxRequests: 3, windowMs: 60000 })
    if (!rateCheck.allowed) {
      log.warn('Rate limit exceeded', {
        action: 'POST /api/feedback',
        duration: Date.now() - start,
        metadata: { ip },
      })
      return NextResponse.json(
        { error: '提交太频繁，请稍后再试' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { content } = body

    // 验证内容
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: '留言内容不能为空' },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: '留言内容不能为空' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > 500) {
      return NextResponse.json(
        { error: '留言内容不能超过 500 字' },
        { status: 400 }
      )
    }

    // 存入数据库
    const feedback = await createFeedback(trimmedContent)

    log.info('Feedback submitted', {
      action: 'POST /api/feedback',
      duration: Date.now() - start,
      metadata: { feedbackId: feedback.id },
    })

    return NextResponse.json({ success: true, id: feedback.id })
  } catch (error) {
    log.error('Failed to submit feedback', error, {
      action: 'POST /api/feedback',
      duration: Date.now() - start,
      metadata: { ip },
    })

    return NextResponse.json(
      { error: '提交失败，请稍后再试' },
      { status: 500 }
    )
  }
}
