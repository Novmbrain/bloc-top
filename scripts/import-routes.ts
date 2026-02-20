/**
 * 线路批量导入脚本
 *
 * 用法:
 *   npx tsx scripts/import-routes.ts <json-path> <cragId> [--dry-run]
 *
 * 示例:
 *   npx tsx scripts/import-routes.ts ~/Downloads/jinbang_routes.json jin-bang-gong-yuan --dry-run
 *   npx tsx scripts/import-routes.ts ~/Downloads/jinbang_routes.json jin-bang-gong-yuan
 *
 * 环境变量:
 *   MONGODB_URI — 从 apps/pwa/.env.local 或 .env.production.local 读取
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { MongoClient } from 'mongodb'
import { config } from 'dotenv'

// ==================== 类型 ====================

interface JsonRoute {
  name: string
  description: string
  set: string | null
  fa: string | null
  grade: string
}

interface JsonArea {
  area_name: string
  routes: JsonRoute[]
}

interface JsonData {
  areas: JsonArea[]
}

interface ParsedGrade {
  grade: string
  note: string | null
}

// ==================== Grade 解析 ====================

function parseGrade(raw: string): ParsedGrade {
  const trimmed = raw.trim()

  // "Project,估计V12以上" → "？"
  if (/^project/i.test(trimmed)) {
    return { grade: '？', note: trimmed }
  }

  // "V8,臂展165以下很困难" → grade="V8", note="臂展165以下很困难"
  const commaMatch = trimmed.match(/^(V\d+)\s*[,，]\s*(.+)$/)
  if (commaMatch) {
    return { grade: commaMatch[1], note: commaMatch[2] }
  }

  // "V6-7" or "V4-5?" → 取低值
  const rangeMatch = trimmed.match(/^(V\d+)-\d+(\??)$/)
  if (rangeMatch) {
    return { grade: rangeMatch[1], note: `原始定级: ${trimmed}` }
  }

  // 纯文字描述含 V 等级，如 "使用起步手点上方较大抠点V4,不使用V5"
  const embeddedMatch = trimmed.match(/V(\d+)/)
  if (embeddedMatch && !/^V\d+$/.test(trimmed)) {
    return { grade: `V${embeddedMatch[1]}`, note: `原始定级说明: ${trimmed}` }
  }

  // 标准 "V2" → 直接使用
  if (/^V\d+$/.test(trimmed)) {
    return { grade: trimmed, note: null }
  }

  // 无法解析 → "？"
  return { grade: '？', note: `无法解析的定级: ${trimmed}` }
}

function buildDescription(original: string | null, gradeNote: string | null): string | undefined {
  if (!gradeNote && !original) return undefined
  if (!gradeNote) return original || undefined

  const prefix = `[${gradeNote}]`
  if (!original) return prefix
  return `${prefix} ${original}`
}

// ==================== 主逻辑 ====================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const positional = args.filter((a) => !a.startsWith('--'))

  if (positional.length < 2) {
    console.error('用法: npx tsx scripts/import-routes.ts <json-path> <cragId> [--dry-run] [--prod]')
    process.exit(1)
  }

  const jsonPath = resolve(positional[0])
  const cragId = positional[1]
  const useProd = args.includes('--prod')

  // 加载环境变量（--prod 优先读取 .env.production.local）
  if (useProd) {
    config({ path: resolve(__dirname, '../.env.production.local'), override: true })
    config({ path: resolve(__dirname, '../apps/pwa/.env.production.local'), override: true })
  }
  config({ path: resolve(__dirname, '../apps/pwa/.env.local') })

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('错误: MONGODB_URI 未设置。请检查 apps/pwa/.env.local 或 .env.production.local')
    process.exit(1)
  }

  // 读取 JSON
  const raw = readFileSync(jsonPath, 'utf-8')
  const data: JsonData = JSON.parse(raw)

  // 收集所有待导入线路
  const routes: Array<{
    name: string
    grade: string
    area: string
    cragId: string
    description?: string
    setter?: string
    FA?: string
  }> = []

  for (const area of data.areas) {
    for (const r of area.routes) {
      const { grade, note } = parseGrade(r.grade)
      const description = buildDescription(r.description, note)

      routes.push({
        name: r.name,
        grade,
        area: area.area_name,
        cragId,
        ...(description ? { description } : {}),
        ...(r.set ? { setter: r.set } : {}),
        ...(r.fa ? { FA: r.fa } : {}),
      })
    }
  }

  console.log(`\n📄 文件: ${jsonPath}`)
  console.log(`🏔️  岩场: ${cragId}`)
  console.log(`🔗 环境: ${useProd ? '生产' : '开发'}`)
  console.log(`📊 共 ${routes.length} 条线路，分布在 ${data.areas.length} 个区域\n`)

  // Grade 分布
  const gradeCount: Record<string, number> = {}
  for (const r of routes) {
    gradeCount[r.grade] = (gradeCount[r.grade] || 0) + 1
  }
  console.log('等级分布:')
  const sortedGrades = Object.entries(gradeCount).sort((a, b) => {
    const va = a[0] === '？' ? -1 : parseInt(a[0].slice(1))
    const vb = b[0] === '？' ? -1 : parseInt(b[0].slice(1))
    return va - vb
  })
  for (const [g, c] of sortedGrades) {
    console.log(`  ${g.padEnd(4)} ${c} 条`)
  }

  // 显示 grade 有备注的线路
  const withNotes = routes.filter((r) => r.description?.startsWith('['))
  if (withNotes.length > 0) {
    console.log(`\n⚠️  ${withNotes.length} 条线路的等级经过转换:`)
    for (const r of withNotes) {
      const noteEnd = r.description!.indexOf(']')
      const note = r.description!.substring(1, noteEnd)
      console.log(`  ${r.name.padEnd(16)} → ${r.grade.padEnd(4)} (${note})`)
    }
  }

  if (dryRun) {
    console.log('\n🔍 Dry-run 模式，未实际写入数据库')
    console.log('\n所有待导入线路:')
    for (const r of routes) {
      console.log(`  [${r.area}] ${r.grade.padEnd(4)} ${r.name}`)
    }
    process.exit(0)
  }

  // 连接数据库
  const dbName = process.env.MONGODB_DB_NAME
  if (!dbName) {
    console.error('错误: MONGODB_DB_NAME 未设置')
    process.exit(1)
  }
  console.log(`\n连接数据库 (${dbName})...`)
  const client = new MongoClient(mongoUri)
  await client.connect()
  const db = client.db(dbName)
  const collection = db.collection('routes')

  // 检查岩场是否存在
  const crag = await db.collection('crags').findOne({ _id: cragId as unknown as any })
  if (!crag) {
    console.error(`错误: 岩场 "${cragId}" 不存在于数据库中`)
    await client.close()
    process.exit(1)
  }
  console.log(`✅ 岩场已确认: ${crag.name || cragId}`)

  // 检查重名
  const existingRoutes = await collection
    .find({ cragId })
    .project({ name: 1 })
    .toArray()
  const existingNames = new Set(existingRoutes.map((r) => r.name))

  // 获取最大 ID
  const lastDoc = await collection.find().sort({ _id: -1 }).limit(1).toArray()
  let nextId = lastDoc.length > 0 ? (lastDoc[0]._id as unknown as number) + 1 : 1

  let inserted = 0
  let skipped = 0
  let failed = 0

  for (const r of routes) {
    if (existingNames.has(r.name)) {
      console.log(`  ⏭️  跳过 (已存在): ${r.name}`)
      skipped++
      continue
    }

    try {
      const doc = {
        _id: nextId as unknown as any,
        ...r,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await collection.insertOne(doc)
      console.log(`  ✅ #${nextId} ${r.grade.padEnd(4)} ${r.name}`)
      nextId++
      inserted++
    } catch (err: any) {
      console.error(`  ❌ 失败: ${r.name} — ${err.message}`)
      failed++
    }
  }

  // 更新岩场的 areas 列表
  const newAreas = data.areas.map((a) => a.area_name)
  const existingAreas: string[] = crag.areas || []
  const mergedAreas = [...new Set([...existingAreas, ...newAreas])]
  if (mergedAreas.length > existingAreas.length) {
    await db.collection('crags').updateOne(
      { _id: cragId as unknown as any },
      { $set: { areas: mergedAreas, updatedAt: new Date() } }
    )
    console.log(`\n📁 岩场区域已更新: ${mergedAreas.join(', ')}`)
  }

  await client.close()

  console.log(`\n========== 导入完成 ==========`)
  console.log(`✅ 成功: ${inserted} 条`)
  console.log(`⏭️  跳过: ${skipped} 条`)
  if (failed > 0) console.log(`❌ 失败: ${failed} 条`)
  console.log(`===============================\n`)
}

main().catch((err) => {
  console.error('导入失败:', err)
  process.exit(1)
})
