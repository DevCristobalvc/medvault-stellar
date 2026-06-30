import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const VaultScene = lazy(() => import('@/components/three/VaultScene'))

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

function HeroFallback({ animate }: { animate: boolean }) {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        animate={
          animate
            ? { boxShadow: ['0 0 0 0 rgba(27,79,216,0)', '0 0 0 12px rgba(27,79,216,0.08)', '0 0 0 0 rgba(27,79,216,0)'] }
            : {}
        }
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-md md:h-20 md:w-20"
      >
        <ShieldCheck className="h-8 w-8 text-primary-foreground md:h-10 md:w-10" />
      </motion.div>
    </div>
  )
}

export function Hero3D() {
  const reduced = useReducedMotion()
  const [enabled, setEnabled] = useState(false)
  const progress = useRef(0)

  useEffect(() => {
    setEnabled(!reduced && hasWebGL())
  }, [reduced])

  useEffect(() => {
    if (!enabled) return
    const onScroll = () => {
      const max = window.innerHeight * 0.8
      progress.current = Math.min(Math.max(window.scrollY / max, 0), 1)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [enabled])

  return (
    <div
      aria-hidden="true"
      className="relative z-10 mx-auto h-56 w-full max-w-md md:h-72"
    >
      {enabled ? (
        <Suspense fallback={<HeroFallback animate={false} />}>
          <VaultScene progress={progress} />
        </Suspense>
      ) : (
        <HeroFallback animate={!reduced} />
      )}
    </div>
  )
}
