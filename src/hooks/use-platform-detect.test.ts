import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

describe('usePlatformDetect', () => {
  const originalUA = navigator.userAgent
  const originalVendor = navigator.vendor

  function mockUserAgent(ua: string, vendor = '') {
    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
    Object.defineProperty(navigator, 'vendor', { value: vendor, configurable: true })
  }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true })
    Object.defineProperty(navigator, 'vendor', { value: originalVendor, configurable: true })
  })

  it('should detect iOS Safari', async () => {
    mockUserAgent(
      'mozilla/5.0 (iphone; cpu iphone os 17_0 like mac os x) applewebkit/605.1.15 (khtml, like gecko) version/17.0 mobile/15e148 safari/604.1',
      'Apple Computer, Inc.'
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.platform).toBe('ios')
    expect(result.current.browser).toBe('safari')
    expect(result.current.isIOSSafari).toBe(true)
    expect(result.current.isMobile).toBe(true)
    expect(result.current.supportsNativePrompt).toBe(false)
    expect(result.current.isReady).toBe(true)
  })

  it('should detect Android Chrome', async () => {
    mockUserAgent(
      'mozilla/5.0 (linux; android 14) applewebkit/537.36 (khtml, like gecko) chrome/120.0.0.0 mobile safari/537.36',
      'Google Inc.'
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.platform).toBe('android')
    expect(result.current.browser).toBe('chrome')
    expect(result.current.isAndroidChrome).toBe(true)
    expect(result.current.supportsNativePrompt).toBe(true)
  })

  it('should detect iOS Chrome as iOS not Safari', async () => {
    mockUserAgent(
      'mozilla/5.0 (iphone; cpu iphone os 17_0 like mac os x) applewebkit/605.1.15 (khtml, like gecko) crios/120.0.0.0 mobile/15e148 safari/604.1',
      'Apple Computer, Inc.'
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.platform).toBe('ios')
    expect(result.current.browser).toBe('chrome')
    expect(result.current.isIOSNotSafari).toBe(true)
    expect(result.current.supportsNativePrompt).toBe(false)
  })

  it('should detect desktop macOS Chrome', async () => {
    mockUserAgent(
      'mozilla/5.0 (macintosh; intel mac os x 10_15_7) applewebkit/537.36 (khtml, like gecko) chrome/120.0.0.0 safari/537.36',
      'Google Inc.'
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.platform).toBe('macos')
    expect(result.current.browser).toBe('chrome')
    expect(result.current.isMobile).toBe(false)
    expect(result.current.supportsNativePrompt).toBe(true)
  })

  it('should detect Firefox on Windows', async () => {
    mockUserAgent(
      'mozilla/5.0 (windows nt 10.0; win64; x64; rv:120.0) gecko/20100101 firefox/120.0',
      ''
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.platform).toBe('windows')
    expect(result.current.browser).toBe('firefox')
    expect(result.current.supportsNativePrompt).toBe(false)
  })

  it('should detect Edge as Chromium', async () => {
    mockUserAgent(
      'mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/120.0.0.0 safari/537.36 edg/120.0.0.0',
      'Google Inc.'
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.browser).toBe('edge')
    expect(result.current.isChromium).toBe(true)
    expect(result.current.supportsNativePrompt).toBe(true)
  })

  it('should detect Samsung Internet', async () => {
    mockUserAgent(
      'mozilla/5.0 (linux; android 13) applewebkit/537.36 (khtml, like gecko) samsungbrowser/23.0 chrome/115.0.0.0 mobile safari/537.36',
      ''
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.browser).toBe('samsung')
    expect(result.current.isChromium).toBe(true)
  })

  it('should detect Opera', async () => {
    mockUserAgent(
      'mozilla/5.0 (macintosh; intel mac os x 10_15_7) applewebkit/537.36 (khtml, like gecko) chrome/120.0.0.0 safari/537.36 opr/106.0.0.0',
      'Google Inc.'
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.browser).toBe('opera')
    expect(result.current.isChromium).toBe(true)
  })

  it('should detect Linux', async () => {
    mockUserAgent(
      'mozilla/5.0 (x11; linux x86_64) applewebkit/537.36 (khtml, like gecko) chrome/120.0.0.0 safari/537.36',
      'Google Inc.'
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.platform).toBe('linux')
  })

  it('should detect Android non-Chrome as not supporting native prompt', async () => {
    mockUserAgent(
      'mozilla/5.0 (linux; android 13) applewebkit/537.36 (khtml, like gecko) version/4.0 mobile safari/537.36',
      ''
    )
    const { usePlatformDetect } = await import('./use-platform-detect')
    const { result } = renderHook(() => usePlatformDetect())

    expect(result.current.platform).toBe('android')
    expect(result.current.isAndroidNotChrome).toBe(true)
  })
})
