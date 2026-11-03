import { useScrollReveal } from '@/hooks/useScrollReveal'

export function Reveal({
  children,
  className = '',
  delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`reveal reveal-delay-${delay} ${isVisible ? 'visible' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
