import { Suspense, lazy, useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const HumanDataField = lazy(() => import('@/components/three/HumanDataField'))

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return (
      !!window.WebGLRenderingContext &&
      !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

const TECH: { label: string; appear: number; className: string }[] = [
  { label: 'AES-256-GCM', appear: 0.4, className: 'top-24 left-5 md:left-16 text-[#1B4FD8]' },
  { label: 'ECIES · secp256k1', appear: 0.46, className: 'top-32 right-5 md:right-20 text-[#A87900]' },
  { label: 'SHA-256', appear: 0.5, className: 'top-1/2 left-6 md:left-24 text-[#1B4FD8]' },
  { label: 'IPFS · CID', appear: 0.55, className: 'top-1/3 right-6 md:right-28 text-[#A87900]' },
  { label: 'Groth16 · BLS12-381', appear: 0.6, className: 'bottom-28 left-5 md:left-20 text-[#1B4FD8]' },
  { label: 'Soroban · Stellar', appear: 0.66, className: 'bottom-20 right-5 md:right-16 text-[#A87900]' },
]

export function ParticleBackdrop({ progress }: { progress: { current: number } }) {
  const reduced = useReducedMotion()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(!reduced && hasWebGL())
  }, [reduced])

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ background: 'radial-gradient(130% 90% at 50% 0%, #fbfcff 0%, #eef2fb 52%, #e3eaf6 100%)' }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/4 h-[65vh] w-[65vh] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(27,79,216,0.14) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className="pointer-events-none absolute left-1/2 bottom-1/5 h-[45vh] w-[45vh] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(245,190,0,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }}
      />

      {enabled && (
        <Suspense fallback={null}>
          <HumanDataField progress={progress} />
        </Suspense>
      )}

      {enabled && (
        <div className="pointer-events-none absolute inset-0 select-none font-mono text-[10px] tracking-wider sm:text-[11px]">
          {TECH.map(({ label, appear, className }) => (
            <span
              key={label}
              className={`absolute whitespace-nowrap rounded-full border border-border/60 bg-white/75 px-2.5 py-1 shadow-sm backdrop-blur-md ${className}`}
              style={{
                opacity: `calc((var(--p) - ${appear}) * 4)`,
                transform: 'translateY(calc((1 - var(--p)) * 6px))',
                textShadow: '0 1px 2px rgba(255,255,255,0.9)',
              }}
            >
              {`[ ${label} ]`}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
