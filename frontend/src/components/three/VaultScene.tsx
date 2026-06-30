import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sparkles, RoundedBox, Icosahedron } from '@react-three/drei'
import * as THREE from 'three'

const BLUE = '#1B4FD8'
const GOLD = '#F5BE00'

interface VaultProps {
  progress?: { current: number }
}

function Vault({ progress }: VaultProps) {
  const group = useRef<THREE.Group>(null)
  const shellGroup = useRef<THREE.Group>(null)
  const shellMat = useRef<THREE.MeshBasicMaterial>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const core = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((state, delta) => {
    const p = progress?.current ?? 0
    const g = group.current
    if (g) {
      g.rotation.y += delta * (0.22 + p * 0.6)
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, state.pointer.y * 0.28, 0.05)
      g.position.x = THREE.MathUtils.lerp(g.position.x, state.pointer.x * 0.25, 0.05)
    }
    if (shellGroup.current) {
      shellGroup.current.scale.setScalar(1 + p * 0.7)
      shellGroup.current.rotation.x -= delta * 0.16
      shellGroup.current.rotation.z -= delta * 0.1
    }
    if (shellMat.current) shellMat.current.opacity = 0.32 * (1 - p)
    if (ringMat.current) ringMat.current.opacity = 0.55 * (1 - p * 0.85)
    if (core.current) core.current.emissiveIntensity = 0.18 + p * 0.5
  })

  return (
    <group ref={group}>
      <Float speed={1.6} rotationIntensity={0.4} floatIntensity={0.9}>
        <RoundedBox args={[1.55, 1.55, 1.55]} radius={0.18} smoothness={6}>
          <meshStandardMaterial
            ref={core}
            color={BLUE}
            metalness={0.6}
            roughness={0.22}
            emissive={BLUE}
            emissiveIntensity={0.18}
          />
        </RoundedBox>
        <group ref={shellGroup}>
          <Icosahedron args={[1.55, 0]}>
            <meshBasicMaterial ref={shellMat} color={GOLD} wireframe transparent opacity={0.32} />
          </Icosahedron>
          <mesh rotation={[Math.PI / 2.3, 0.35, 0]}>
            <torusGeometry args={[1.95, 0.018, 16, 90]} />
            <meshBasicMaterial ref={ringMat} color={GOLD} transparent opacity={0.55} />
          </mesh>
        </group>
      </Float>
      <Sparkles count={36} scale={5} size={2.4} speed={0.3} color={GOLD} opacity={0.6} />
      <Sparkles count={28} scale={6} size={1.6} speed={0.2} color="#ffffff" opacity={0.5} />
    </group>
  )
}

export default function VaultScene({ progress }: VaultProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5.2], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 5, 3]} intensity={1.5} />
      <pointLight position={[-4, -2, -2]} intensity={28} color={BLUE} />
      <pointLight position={[3, 2, 4]} intensity={18} color={GOLD} />
      <Vault progress={progress} />
    </Canvas>
  )
}
