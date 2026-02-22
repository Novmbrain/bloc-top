import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoverCarousel } from './cover-carousel'

// Mock next/image — render as plain img with data attributes for testability
vi.mock('next/image', () => ({
  default: ({ src, alt, priority, unoptimized, fill, onError, ...rest }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src as string}
      alt={alt as string}
      data-testid="carousel-image"
      data-priority={priority ? 'true' : 'false'}
      data-unoptimized={unoptimized ? 'true' : 'false'}
      {...rest}
    />
  ),
}))

describe('CoverCarousel', () => {
  const defaultImages = ['/img/cover-0.jpg', '/img/cover-1.jpg', '/img/cover-2.jpg']

  it('renders all images', () => {
    render(<CoverCarousel images={defaultImages} alt="Test Crag" />)
    const images = screen.getAllByTestId('carousel-image')
    expect(images).toHaveLength(3)
  })

  it('renders single image without dot indicators', () => {
    const { container } = render(<CoverCarousel images={['/img/cover-0.jpg']} alt="Test Crag" />)
    const images = screen.getAllByTestId('carousel-image')
    expect(images).toHaveLength(1)
    // No dot indicators for single image
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots.length).toBe(0)
  })

  it('renders dot indicators for multiple images', () => {
    const { container } = render(<CoverCarousel images={defaultImages} alt="Test Crag" />)
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots.length).toBe(3)
  })

  it('sets priority on first image only', () => {
    render(<CoverCarousel images={defaultImages} alt="Test Crag" />)
    const images = screen.getAllByTestId('carousel-image')
    expect(images[0].getAttribute('data-priority')).toBe('true')
    expect(images[1].getAttribute('data-priority')).toBe('false')
    expect(images[2].getAttribute('data-priority')).toBe('false')
  })

  it('calls onError when image fails to load', () => {
    const onError = vi.fn()
    render(<CoverCarousel images={defaultImages} alt="Test Crag" onError={onError} />)
    const images = screen.getAllByTestId('carousel-image')
    expect(images).toHaveLength(3)
  })

  it('applies correct alt text with index', () => {
    render(<CoverCarousel images={defaultImages} alt="Test Crag" />)
    const images = screen.getAllByTestId('carousel-image')
    expect(images[0].getAttribute('alt')).toBe('Test Crag 1')
    expect(images[1].getAttribute('alt')).toBe('Test Crag 2')
    expect(images[2].getAttribute('alt')).toBe('Test Crag 3')
  })

  it('applies scroll-snap styles', () => {
    const { container } = render(<CoverCarousel images={defaultImages} alt="Test Crag" />)
    const scrollContainer = container.querySelector('.overflow-x-auto')
    expect(scrollContainer).not.toBeNull()
  })

  it('supports unoptimized prop for offline images', () => {
    render(<CoverCarousel images={defaultImages} alt="Test Crag" unoptimized />)
    const images = screen.getAllByTestId('carousel-image')
    expect(images[0].getAttribute('data-unoptimized')).toBe('true')
  })

  it('supports custom height', () => {
    const { container } = render(<CoverCarousel images={defaultImages} alt="Test Crag" height="h-64" />)
    const scrollContainer = container.querySelector('.h-64')
    expect(scrollContainer).not.toBeNull()
  })
})
