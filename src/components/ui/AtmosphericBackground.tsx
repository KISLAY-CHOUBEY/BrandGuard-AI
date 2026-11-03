import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useTheme } from '@/context/useTheme'
import type { Group, WebGLRenderer, Scene } from 'three'
import * as THREE from 'three'

interface NavigatorConnection {
  saveData?: boolean
}

interface ExtendedNavigator extends Navigator {
  connection?: NavigatorConnection
}

/**
 * Detect iOS Safari Low Power Mode
 * Low Power Mode reduces available GPU resources and can cause Three.js to crash or perform poorly
 */
function isIOSLowPowerMode(): boolean {
  if (typeof navigator === 'undefined') return false
  // Check for iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIOS) return false

  // There's no direct API for Low Power Mode, but we can infer from:
  // 1. navigator.connection.saveData (not widely supported on iOS)
  // 2. Battery Status API (deprecated)
  // 3. Use a heuristic: if device reports low memory or reduced frame rate capability
  const connection = (navigator as ExtendedNavigator).connection
  if (connection?.saveData) return true

  // Check for hardware concurrency (low on iOS in low power mode)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return true

  return false
}

/**
 * CSS-based atmospheric background layers.
 * Renders as fixed positioned pseudo-elements for performance.
 * No canvas, no React re-renders for animation.
 */
export function AtmosphericBackground() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (!mounted) return null

  const isDark = resolvedTheme === 'dark'

  return (
    <div
      className="fixed inset-0 -z-20 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #0a0a12 0%, #0f0f1a 40%, #0a0a12 100%)'
          : 'linear-gradient(180deg, #fafafa 0%, #f0f0f5 50%, #e8e8f0 100%)',
      }}
    >
      {/* Layer 1: Large subtle radial glows - warm gold ambient */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? `
              radial-gradient(ellipse 80% 60% at 20% 10%, rgba(245, 197, 66, 0.08) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 80% 20%, rgba(255, 217, 102, 0.05) 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 50% 80%, rgba(245, 197, 66, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse 40% 30% at 90% 90%, rgba(255, 217, 102, 0.03) 0%, transparent 45%)
            `
            : `
              radial-gradient(ellipse 80% 60% at 20% 10%, rgba(230, 184, 61, 0.04) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 80% 20%, rgba(230, 184, 61, 0.03) 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 50% 80%, rgba(230, 184, 61, 0.02) 0%, transparent 50%)
            `,
          animation: reducedMotion ? 'none' : 'glowPulse 20s ease-in-out infinite alternate',
        }}
      />

      {/* Layer 2: Subtle geometric grid overlay - CSS-based, very faint */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isDark
            ? `
              linear-gradient(rgba(245, 197, 66, 0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(245, 197, 66, 0.015) 1px, transparent 1px)
            `
            : `
              linear-gradient(rgba(230, 184, 61, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(230, 184, 61, 0.02) 1px, transparent 1px)
            `,
          backgroundSize: '80px 80px',
          maskImage: isDark
            ? `
              radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 70%),
              radial-gradient(ellipse 50% 40% at 80% 80%, black 10%, transparent 60%)
            `
            : `
              radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 70%)
            `,
          opacity: isDark ? 0.6 : 0.4,
          animation: reducedMotion ? 'none' : 'gridDrift 60s linear infinite',
        }}
      />

      {/* Layer 3: Subtle light streaks / geometric outlines - distant atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? `
              linear-gradient(135deg, transparent 48%, rgba(245, 197, 66, 0.008) 49%, rgba(245, 197, 66, 0.008) 51%, transparent 52%),
              linear-gradient(45deg, transparent 48%, rgba(255, 217, 102, 0.006) 49%, rgba(255, 217, 102, 0.006) 51%, transparent 52%)
            `
            : `
              linear-gradient(135deg, transparent 48%, rgba(230, 184, 61, 0.01) 49%, rgba(230, 184, 61, 0.01) 51%, transparent 52%)
            `,
          backgroundSize: '400px 400px, 300px 300px',
          opacity: isDark ? 0.5 : 0.3,
          animation: reducedMotion ? 'none' : 'streakShift 40s ease-in-out infinite alternate',
        }}
      />

      {/* Layer 4: Vignette - subtle edge darkening for depth */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: isDark
            ? 'inset 0 0 200px rgba(0, 0, 0, 0.5), inset 0 0 300px rgba(10, 10, 18, 0.3)'
            : 'inset 0 0 150px rgba(0, 0, 0, 0.05)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

/**
 * Enhanced Three.js background - refined version of existing ThreeBackground.
 * More subtle, better materials, fewer particles, smoother animation.
 */
export function EnhancedThreeBackground() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isLowPowerMode, setIsLowPowerMode] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)

    // Check for low power mode on mount
    setIsLowPowerMode(isIOSLowPowerMode())

    const visibilityHandler = () => {
      if (!document.hidden) {
        setIsLowPowerMode(isIOSLowPowerMode())
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)

    return () => {
      mq.removeEventListener('change', handler)
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [])

  if (!mounted || reducedMotion || isLowPowerMode) return null

  return <ThreeSceneWrapper isDark={resolvedTheme === 'dark'} />
}

// Separate component to avoid SSR issues and enable dynamic import
interface ThreeCanvasProps {
  children?: React.ReactNode
  camera?: { position: number[]; fov: number }
  style?: React.CSSProperties
  gl?: { antialias?: boolean; alpha?: boolean; preserveDrawingBuffer?: boolean }
  shadows?: boolean
  onCreated?: (args: { scene: Scene; gl: WebGLRenderer }) => void
}

function ThreeSceneWrapper({ isDark }: { isDark: boolean }) {
  const [Canvas, setCanvas] = React.useState<React.ComponentType<ThreeCanvasProps> | null>(null)

  React.useEffect(() => {
    import('@react-three/fiber').then(({ Canvas: C }) => {
      import('@react-three/drei').then(() => {
        import('three').then(() => {
          setCanvas(C as unknown as React.ComponentType<ThreeCanvasProps>)
        })
      })
    })
  }, [])

  if (!Canvas) return null

  return <CanvasComponent Canvas={Canvas} isDark={isDark} />
}

function CanvasComponent({ Canvas, isDark }: { Canvas: React.ComponentType<ThreeCanvasProps>; isDark: boolean }) {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 1.5, 8], fov: 40 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        shadows={false}
        onCreated={({ scene, gl }: { scene: Scene; gl: WebGLRenderer }) => {
          const fogColor = isDark ? '#0a0a12' : '#f0f0f5'
          scene.fog = new THREE.Fog(fogColor, 3, 15)
          gl.setClearColor(0x000000, 0)
        }}
      >
        <ambientLight intensity={isDark ? 0.4 : 0.6} color={isDark ? '#f5c542' : '#e6b83d'} />
        <directionalLight position={[3, 8, 4]} intensity={isDark ? 0.3 : 0.5} color={isDark ? '#fff8e7' : '#ffffff'} />
        <hemisphereLight color={isDark ? '#f5c542' : '#e6b83d'} groundColor={isDark ? '#0a0a12' : '#f0f0f5'} intensity={0.2} />
        <ThreeSceneContent isDark={isDark} />
      </Canvas>
    </div>
  )
}

// This component uses React Three Fiber JSX elements
function ThreeSceneContent({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<Group>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    let frameId: number
    const animate = () => {
      timeRef.current += 0.0015
      if (groupRef.current) {
        groupRef.current.rotation.y = Math.sin(timeRef.current * 0.15) * 0.08
        groupRef.current.rotation.x = Math.cos(timeRef.current * 0.1) * 0.03
      }
      frameId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frameId)
  }, [])

  // Floating geometric shapes - fewer, more elegant
  const shapes = useMemo(() => {
    const geometries = [
      () => <boxGeometry args={[0.8, 0.8, 0.8]} />,
      () => <sphereGeometry args={[0.5, 16, 16]} />,
      () => <octahedronGeometry args={[0.6, 0]} />,
    ]

    return Array.from({ length: 5 }, (_, i) => {
      const angle = (i / 5) * Math.PI * 2
      const radius = 3.5 + Math.random() * 1.5
      const height = (Math.random() - 0.5) * 2
      const geometryType = Math.floor(Math.random() * geometries.length)

      return (
        <mesh
          key={i}
          position={[Math.cos(angle) * radius, height, Math.sin(angle) * radius]}
          rotation={[Math.random() * Math.PI * 0.3, Math.random() * Math.PI * 0.3, 0]}
          scale={0.4 + Math.random() * 0.3}
        >
          {geometries[geometryType]()}
          <meshPhysicalMaterial
            color={isDark ? '#f5c542' : '#e6b83d'}
            metalness={0.2}
            roughness={0.5}
            transmission={0.2}
            thickness={0.3}
            ior={1.4}
            transparent
            opacity={0.12}
          />
        </mesh>
      )
    })
  }, [isDark])

  // Sparse particles
  const particles = useMemo(() => {
    const count = 30
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const goldColor = new THREE.Color(isDark ? '#f5c542' : '#e6b83d')
    const amberColor = new THREE.Color(isDark ? '#ffd966' : '#d4a82e')

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
      sizes[i] = Math.random() * 1.5 + 0.3
      const color = Math.random() > 0.5 ? goldColor : amberColor
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return (
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-size" array={sizes} itemSize={1} />
          <bufferAttribute attach="attributes-color" array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={1}
          sizeAttenuation
          transparent
          opacity={0.25}
          vertexColors
        />
      </points>
    )
  }, [isDark])

  return (
    <group ref={groupRef}>
      <group>{shapes}</group>
      {particles}
    </group>
  )
}

/**
 * Combined background component - uses both CSS atmospheric layers and enhanced Three.js
 */
export function PremiumBackground() {
  return (
    <>
      <AtmosphericBackground />
      <EnhancedThreeBackground />
    </>
  )
}