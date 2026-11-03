import { useEffect, useState, useRef, useCallback } from 'react'

export function useScrollReveal(options?: IntersectionObserverInit) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    if (entry?.isIntersecting) {
      setIsVisible(true)
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
      ...options,
    })
    const currentRef = ref.current
    if (currentRef) observer.observe(currentRef)
    return () => observer.disconnect()
  }, [handleObserver, options])

  return { ref, isVisible }
}
