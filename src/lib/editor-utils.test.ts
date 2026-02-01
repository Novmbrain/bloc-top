import { describe, it, expect, vi } from 'vitest'
import { VIEW_WIDTH, VIEW_HEIGHT, GRADE_OPTIONS, preloadImage } from './editor-utils'

describe('editor-utils constants', () => {
  it('should export viewBox dimensions', () => {
    expect(VIEW_WIDTH).toBe(400)
    expect(VIEW_HEIGHT).toBe(300)
  })

  it('should export grade options including mystery grade', () => {
    expect(GRADE_OPTIONS).toContain('V0')
    expect(GRADE_OPTIONS).toContain('V13')
    expect(GRADE_OPTIONS).toContain('？')
    expect(GRADE_OPTIONS).toHaveLength(15)
  })
})

describe('preloadImage', () => {
  it('should resolve when image loads successfully', async () => {
    const originalImage = globalThis.Image
    globalThis.Image = vi.fn().mockImplementation(function (this: { onload: (() => void) | null; src: string }) {
      const self = this
      self.onload = null
      Object.defineProperty(self, 'src', {
        set() {
          // Trigger onload asynchronously
          Promise.resolve().then(() => self.onload?.())
        },
      })
    }) as unknown as typeof Image

    await expect(preloadImage('https://example.com/test.jpg')).resolves.toBeUndefined()
    globalThis.Image = originalImage
  })

  it('should reject after all retries fail', async () => {
    const originalImage = globalThis.Image
    globalThis.Image = vi.fn().mockImplementation(function (this: { onerror: (() => void) | null; src: string }) {
      const self = this
      self.onerror = null
      Object.defineProperty(self, 'src', {
        set() {
          Promise.resolve().then(() => self.onerror?.())
        },
      })
    }) as unknown as typeof Image

    await expect(preloadImage('https://example.com/bad.jpg')).rejects.toThrow()
    globalThis.Image = originalImage
  }, 15000)
})
