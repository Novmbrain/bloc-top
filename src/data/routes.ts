import type { Route } from '@/types'

export const routes: Route[] = [
  // 圆通寺线路
  { id: 31, name: '不抢', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: '谢文辉' },
  { id: 32, name: '半斤八两', grade: 'V2', cragId: 'yuan-tong-si', area: '圆通石', FA: '田仔' },
  { id: 33, name: '艳阳天', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: '高忠渊' },
  { id: 34, name: '黑爆', grade: 'V7', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Lee' },
  { id: 35, name: '云外苍天', grade: 'V5', cragId: 'yuan-tong-si', area: '圆通石', FA: '小西 麻美' },
  { id: 36, name: '清白之年', grade: 'V6', cragId: 'yuan-tong-si', area: '圆通石', FA: '郑斌' },
  { id: 37, name: '风之谷', grade: 'V8', cragId: 'yuan-tong-si', area: '圆通石', FA: '久违' },
  { id: 38, name: '野攀乐园', grade: 'V8', cragId: 'yuan-tong-si', area: '圆通石', FA: '老六' },
  { id: 39, name: '晨钟暮鼓', grade: 'V5', cragId: 'yuan-tong-si', area: '圆通石', FA: '胡杨兮' },
  { id: 40, name: '生日快乐', grade: 'V3', cragId: 'yuan-tong-si', area: '圆通石', FA: '虎妞' },
  { id: 41, name: '打草惊蛇', grade: 'V3', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Fiona' },
  { id: 42, name: '梦中繁星', grade: 'V3', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Fiona' },
  { id: 43, name: '予汐', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: '曾俊文' },
  { id: 44, name: '不争', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: '谢文辉' },
  { id: 45, name: '威海离别信', grade: 'V9', cragId: 'yuan-tong-si', area: '圆通石', FA: '黄周文' },
  { id: 46, name: '月光', grade: 'V9', cragId: 'yuan-tong-si', area: '圆通石', FA: '李诚' },
  { id: 47, name: '红豆', grade: 'V10', cragId: 'yuan-tong-si', area: '圆通石', FA: '黄周文' },
  { id: 48, name: '鱼你同行', grade: 'V3', cragId: 'yuan-tong-si', area: '圆通石', description: '挂脚起，线路左侧两个洞可用。' },
  { id: 49, name: '热身线', grade: 'V1', cragId: 'yuan-tong-si', area: '圆通石', description: '裂缝并手起，脚点不限。' },
  { id: 50, name: '鲸鲨', grade: 'V6', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Daluo' },
  { id: 51, name: '年年有鱼', grade: 'V5', cragId: 'yuan-tong-si', area: '圆通石', FA: 'xiang' },
  { id: 52, name: '鱼尔', grade: 'V2', cragId: 'yuan-tong-si', area: '圆通石', FA: '记录员BIN' },
  { id: 53, name: '虎纠鱼丸', grade: 'V4', cragId: 'yuan-tong-si', area: '圆通石', FA: 'Wenjie FU' },

  // 八井村线路
  { id: 54, name: '草帽', grade: 'V2', cragId: 'ba-jing-cun', area: '罗源县八井村' },
  { id: 55, name: '糟鳗也好吃', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '薛通劼', description: '坐起。' },
  { id: 56, name: '畲风海韵', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村' },
  { id: 57, name: '绿野寻踪', grade: 'V5', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '胡杨兮' },
  { id: 58, name: '罗源春天', grade: 'V5', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: 'dddragon' },
  { id: 59, name: '柿子红了', grade: 'V6', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '谢文辉' },
  { id: 60, name: 'B5', grade: 'V11', cragId: 'ba-jing-cun', area: '罗源县八井村', description: '【芭蕉绿了】起步手点改低，其余不变。' },
  { id: 61, name: '芭蕉绿了', grade: 'V8', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '氧风' },
  { id: 62, name: '小蜜蜂', grade: 'V7', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '李诚' },
  { id: 63, name: '清泉石上', grade: 'V9', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '氧风' },
  { id: 64, name: '八爪鱼', grade: 'V7', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '李诚' },
  { id: 65, name: '赤脚大仙', grade: 'V6', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '郑斌' },
  { id: 66, name: '赤脚大仙横移', grade: 'V6', cragId: 'ba-jing-cun', area: '罗源县八井村', description: '左手反提右手crimp，完成赤脚大仙后反爬C1，之后继续横移，可翻顶或跳下。' },
  { id: 67, name: '鸭屎香', grade: 'V8', cragId: 'ba-jing-cun', area: '罗源县八井村', description: '两个大手点起步，向左横移翻顶。八井岩场回归首条新线，感谢村民们的支持，未来的日子也要跟鸭鸭、山羊和小蜜蜂一起快乐攀岩。' },
  { id: 68, name: 'C1', grade: 'V5', cragId: 'ba-jing-cun', area: '罗源县八井村' },
  { id: 69, name: '阳光下小憩', grade: 'V1', cragId: 'ba-jing-cun', area: '罗源县八井村' },
  { id: 70, name: '小确幸', grade: 'V2', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '大了' },
  { id: 71, name: '夏夜晚风', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: 'Singing' },
  { id: 72, name: '心流', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村' },
  { id: 73, name: '清风策', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '高忠渊' },
  { id: 74, name: '臭虫让个点', grade: 'V4', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '曾俊文' },
  { id: 77, name: '单枪匹马', grade: 'V5', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '叶鹰英/Shannon组长啊', description: '反提点起步。' },
  { id: 78, name: '向阳花', grade: 'V3', cragId: 'ba-jing-cun', area: '罗源县八井村', FA: '高忠渊', description: '反提点起步。' },
  { id: 79, name: '海阔天空', grade: '？', cragId: 'ba-jing-cun', area: '罗源县八井村' },
]

export function getRouteById(id: number): Route | undefined {
  return routes.find((route) => route.id === id)
}

export function getRoutesByCragId(cragId: string): Route[] {
  return routes.filter((route) => route.cragId === cragId)
}

export function getAllRoutes(): Route[] {
  return routes
}
