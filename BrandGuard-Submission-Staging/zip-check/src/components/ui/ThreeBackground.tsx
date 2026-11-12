import React, { useRef, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function ThreeScene() {
  const groupRef = useRef<THREE.Group>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    let frameId: number
    const animate = () => {
      timeRef.current += 0.005
      if (groupRef.current) {
        groupRef.current.rotation.y = Math.sin(timeRef.current * 0.3) * 0.15
        groupRef.current.rotation.x = Math.cos(timeRef.current * 0.2) * 0.05
      }
      frameId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <group ref={groupRef}>
      {/* Floating geometric shapes */}
      <FloatingShapes count={8} />
      {/* Subtle grid floor */}
      <GridFloor />
      {/* Ambient particles */}
      <Particles count={50} />
    </group>
  )
}

function FloatingShapes({ count }: { count: number }) {
  const shapes = useMemo(() => {
    const geometries = [
      () => <boxGeometry args={[1, 1, 1]} />,
      () => <sphereGeometry args={[0.7, 16, 16]} />,
      () => <octahedronGeometry args={[0.7, 0]} />,
      () => <torusGeometry args={[0.6, 0.2, 8, 16]} />
    ]

    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2
      const radius = 4 + Math.random() * 2
      const height = (Math.random() - 0.5) * 3
      const geometryType = Math.floor(Math.random() * geometries.length)

      return (
        <mesh
          key={i}
          position={[
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
          ]}
          rotation={[
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          ]}
          scale={0.5 + Math.random() * 0.5}
        >
          {geometries[geometryType]()}
          <meshPhysicalMaterial
            color="#f5c542"
            metalness={0.3}
            roughness={0.4}
            transmission={0.3}
            thickness={0.5}
            ior={1.5}
            transparent
            opacity={0.15}
          />
        </mesh>
      )
    })
  }, [count])

  return <group>{shapes}</group>
}

function GridFloor() {
  return (
    <group position={[0, -3, 0]}>
      <gridHelper args={[20, 20, '#f5c542', '#f5c542']} />
    </group>
  )
}

function Particles({ count }: { count: number }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30
      sizes[i] = Math.random() * 2 + 0.5
    }

    return (
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-size" array={sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          color="#f5c542"
          size={1}
          sizeAttenuation
          transparent
          opacity={0.3}
          vertexColors={false}
        />
      </points>
    )
  }, [count])

  return <group>{points}</group>
}

export function ThreeBackground() {
  const [mounted, setMounted] = React.useState(false)
  const [reducedMotion, setReducedMotion] = React.useState(false)

  useEffect(() => {
    setMounted(true)
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  if (!mounted || reducedMotion) return null

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
      style={{ width: '100%', height: '100%' }}
    >
      <Canvas
        camera={{ position: [0, 2, 10], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        shadows={false}
        onCreated={({ scene }) => {
          scene.fog = new THREE.Fog('#0f0f1a', 5, 25)
        }}
      >
        <ambientLight intensity={0.6} color="#f5c542" />
        <directionalLight position={[5, 10, 5]} intensity={0.4} color="#ffffff" />
        <hemisphereLight color="#f5c542" groundColor="#1a1a2e" intensity={0.3} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
          autoRotate={true}
          autoRotateSpeed={0.2}
        />
        <ThreeScene />
      </Canvas>
    </div>
  )
}