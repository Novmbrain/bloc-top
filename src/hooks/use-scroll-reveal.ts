'use client'

import { useEffect, useRef } from 'react'

interface UseScrollRevealOptions {
  threshold?: number
  rootMargin?: string
}

/**
 * Hook that adds `data-visible` attribute to elements when they enter the viewport.
 * Use with `.scroll-reveal` CSS class for scroll-triggered animations.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -40px 0px',
}: UseScrollRevealOptions = {}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', '')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold, rootMargin }
    )

    // Observe the container and all .scroll-reveal children
    const children = el.querySelectorAll('.scroll-reveal')
    children.forEach((child) => observer.observe(child))

    // Also observe the container itself if it has the class
    if (el.classList.contains('scroll-reveal')) {
      observer.observe(el)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return ref
}
