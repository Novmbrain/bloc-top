import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clientLogger, createClientLogger } from './client-logger'

describe('clientLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should log info to console', async () => {
    await clientLogger.info('test message', { component: 'Test' })
    expect(console.log).toHaveBeenCalledWith('[Test] test message', '')
  })

  it('should log warn to console', async () => {
    await clientLogger.warn('warning message', { component: 'Test', action: 'click' })
    expect(console.warn).toHaveBeenCalledWith('[Test](click) warning message', '')
  })

  it('should log error with Error object', async () => {
    const error = new Error('test error')
    await clientLogger.error('error occurred', error, { component: 'Test' })
    expect(console.error).toHaveBeenCalledWith('[Test] error occurred', error, '')
  })

  it('should use [Client] prefix when no component', async () => {
    await clientLogger.info('no component')
    expect(console.log).toHaveBeenCalledWith('[Client] no component', '')
  })

  it('should include metadata in console output', async () => {
    const metadata = { code: 404 }
    await clientLogger.warn('not found', { metadata })
    expect(console.warn).toHaveBeenCalledWith('[Client] not found', metadata)
  })
})

describe('createClientLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should create logger with component prefix', async () => {
    const log = createClientLogger('SearchOverlay')
    await log.info('mounted')
    expect(console.log).toHaveBeenCalledWith('[SearchOverlay] mounted', '')
  })

  it('should merge action into context', async () => {
    const log = createClientLogger('Form')
    await log.warn('validation failed', { action: 'submit' })
    expect(console.warn).toHaveBeenCalledWith('[Form](submit) validation failed', '')
  })

  it('should pass error to error method', async () => {
    const log = createClientLogger('API')
    const err = new Error('network')
    await log.error('request failed', err)
    expect(console.error).toHaveBeenCalledWith('[API] request failed', err, '')
  })
})
