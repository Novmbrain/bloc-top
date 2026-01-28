'use client'

import { useSyncExternalStore } from 'react'

/**
 * 平台类型
 */
export type Platform = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown'

/**
 * 浏览器类型
 */
export type Browser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'opera' | 'samsung' | 'unknown'

/**
 * 平台检测结果
 */
export interface PlatformInfo {
  /** 操作系统平台 */
  platform: Platform
  /** 浏览器类型 */
  browser: Browser
  /** 是否为移动设备 */
  isMobile: boolean
  /** 是否为 iOS Safari（唯一支持 PWA 安装的 iOS 浏览器） */
  isIOSSafari: boolean
  /** 是否为 iOS 非 Safari 浏览器（需引导用户使用 Safari） */
  isIOSNotSafari: boolean
  /** 是否为 Android Chrome（支持 beforeinstallprompt） */
  isAndroidChrome: boolean
  /** 是否为 Android 非 Chrome 浏览器 */
  isAndroidNotChrome: boolean
  /** 是否支持原生安装提示（beforeinstallprompt） */
  supportsNativePrompt: boolean
  /** 是否已安装为 PWA（standalone 模式） */
  isStandalone: boolean
  /** 是否为 Chromium 内核浏览器 */
  isChromium: boolean
  /** 是否已完成客户端检测 */
  isReady: boolean
}

const defaultInfo: PlatformInfo = {
  platform: 'unknown',
  browser: 'unknown',
  isMobile: false,
  isIOSSafari: false,
  isIOSNotSafari: false,
  isAndroidChrome: false,
  isAndroidNotChrome: false,
  supportsNativePrompt: false,
  isStandalone: false,
  isChromium: false,
  isReady: false,
}

/**
 * 检测平台 (纯函数)
 */
function detectPlatform(ua: string): Platform {
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/macintosh|mac os x/.test(ua)) return 'macos'
  if (/windows/.test(ua)) return 'windows'
  if (/linux/.test(ua)) return 'linux'
  return 'unknown'
}

/**
 * 检测浏览器 (纯函数)
 */
function detectBrowser(ua: string, vendor: string): Browser {
  // Safari 检测（注意：Chrome 也包含 Safari 字符串）
  // Safari 特征：包含 Safari，vendor 是 Apple，不包含 Chrome/CriOS/FxiOS/EdgiOS
  const isSafari =
    /safari/.test(ua) &&
    vendor.includes('apple') &&
    !/chrome|crios|fxios|edgios|opr/.test(ua)
  if (isSafari) return 'safari'

  // Samsung Internet
  if (/samsungbrowser/.test(ua)) return 'samsung'

  // Opera（需要在 Chrome 之前检测）
  if (/opr|opera/.test(ua)) return 'opera'

  // Edge（需要在 Chrome 之前检测）
  if (/edg|edgios|edga/.test(ua)) return 'edge'

  // Firefox
  if (/firefox|fxios/.test(ua)) return 'firefox'

  // Chrome（包括移动端 CriOS）
  if (/chrome|crios/.test(ua)) return 'chrome'

  return 'unknown'
}

/**
 * 执行平台检测 (仅客户端)
 */
function getPlatformInfo(): PlatformInfo {
  if (typeof window === 'undefined') {
    return defaultInfo
  }

  const ua = navigator.userAgent.toLowerCase()
  const vendor = navigator.vendor?.toLowerCase() || ''

  const platform = detectPlatform(ua)
  const browser = detectBrowser(ua, vendor)
  const isMobile = platform === 'ios' || platform === 'android'

  // iOS Safari 检测
  const isIOSSafari = platform === 'ios' && browser === 'safari'

  // iOS 非 Safari（Chrome/Firefox/Edge on iOS 无法安装 PWA）
  const isIOSNotSafari = platform === 'ios' && browser !== 'safari'

  // Chromium 内核浏览器（支持 beforeinstallprompt）
  const isChromium = ['chrome', 'edge', 'opera', 'samsung'].includes(browser)

  // Android Chrome
  const isAndroidChrome = platform === 'android' && browser === 'chrome'

  // Android 非 Chrome（可能不支持 beforeinstallprompt）
  const isAndroidNotChrome = platform === 'android' && !isChromium

  // 检测是否已安装为 PWA
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari standalone 检测
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)

  // 支持原生安装提示的条件：
  // 1. Chromium 内核浏览器
  // 2. 不是 iOS（iOS 上的 Chrome/Edge 不支持 PWA 安装）
  // 3. 不是 Safari（Safari 没有 beforeinstallprompt）
  const supportsNativePrompt = isChromium && platform !== 'ios'

  return {
    platform,
    browser,
    isMobile,
    isIOSSafari,
    isIOSNotSafari,
    isAndroidChrome,
    isAndroidNotChrome,
    supportsNativePrompt,
    isStandalone,
    isChromium,
    isReady: true,
  }
}

// 缓存的平台信息（避免重复计算）
let cachedInfo: PlatformInfo | null = null

function subscribe() {
  // 平台信息不会改变，无需订阅
  return () => {}
}

function getSnapshot(): PlatformInfo {
  if (!cachedInfo) {
    cachedInfo = getPlatformInfo()
  }
  return cachedInfo
}

function getServerSnapshot(): PlatformInfo {
  return defaultInfo
}

/**
 * 检测平台和浏览器信息
 * 用于决定显示哪种类型的 PWA 安装提示
 *
 * 使用 useSyncExternalStore 确保正确的 SSR hydration
 *
 * @example
 * ```tsx
 * const { isIOSSafari, isAndroidChrome, supportsNativePrompt, isReady } = usePlatformDetect()
 *
 * if (!isReady) return null // 等待客户端检测完成
 *
 * if (supportsNativePrompt) {
 *   // 使用 beforeinstallprompt API
 * } else if (isIOSSafari) {
 *   // 显示 iOS 安装教程
 * }
 * ```
 */
export function usePlatformDetect(): PlatformInfo {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
