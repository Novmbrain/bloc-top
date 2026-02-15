import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * 国际化导航组件
 *
 * 创建语言感知的导航组件和 hooks：
 * - Link: 自动添加语言前缀的链接组件
 * - useRouter: 语言感知的路由 hook
 * - usePathname: 获取不带语言前缀的路径
 * - redirect: 服务端重定向
 * - permanentRedirect: 永久重定向
 * - getPathname: 获取路径工具函数
 */
export const {
  Link,
  useRouter,
  usePathname,
  redirect,
  permanentRedirect,
  getPathname,
} = createNavigation(routing)
