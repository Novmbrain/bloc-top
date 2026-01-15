import type { Crag } from '@/types'

export const crags: Crag[] = [
  {
    id: 'yuan-tong-si',
    name: '圆通寺',
    location: '福建省福州市罗源县管柄村',
    developmentTime: '2019年4月',
    description:
      '岩场位于罗源县管柄村的圆通寺内，距县中心约五到十分钟车程，是罗源接近性最好的岩场之一。保护平台在寺庙和村民的支持与帮助下已被清理和休整，比较安全。1号石头需翻顶的线路要继续爬一段缓坡到巨石背面下来。周围绿植较多，夏季凉爽，但要注意防蚊虫。可借用寺庙的卫生间与洗池。由于所处环境特殊，请注意尊重相关文化，不要大声喧哗，一起维护寺庙与岩友间的良好关系。',
    approach:
      '高德地图导航至罗源圆通寺，进入村子后容易找到[管柄圆通寺]蓝色路牌，大胆拐进去，上坡，寺院门口有空地可以停车，沿阶梯穿过寺庙，步行2分钟即可到达圆通石。',
  },
  {
    id: 'ba-jing-cun',
    name: '八井村',
    location: '福建省福州市罗源县八井村',
    developmentTime: '2019年6月',
    description:
      '风景好，石头颜值高，晴天特别出片！午后太阳斜晒岩壁。离石头几米处有泉水（水源近期似乎被截走，后续会更新近况），度假区内有公共卫生间。晚饭可以就地在旁边饭馆吃饭（老板对岩友很友好）（人多建议提前下去安排杀鸡杀鸭炖汤）。',
    approach:
      '地图导航至畲乡里民宿，离县中心约十五分钟车程，车停在畲乡里民宿度假区停车场，上坡沿着土路步行约两三分钟到达。',
  },
]

export function getCragById(id: string): Crag | undefined {
  return crags.find((crag) => crag.id === id)
}

export function getAllCrags(): Crag[] {
  return crags
}
