import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  size: number
  hue: 'white' | 'blue' | 'gold'
}

interface StarFieldProps {
  density?: number
  speed?: number
  className?: string
}

const COLORS: Record<Star['hue'], string> = {
  white: '255,255,255',
  blue: '27,79,216',
  gold: '245,190,0',
}

function pickHue(): Star['hue'] {
  const r = Math.random()
  if (r < 0.72) return 'white'
  if (r < 0.9) return 'blue'
  return 'gold'
}

export function StarField({ density = 0.00018, speed = 0.04, className }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let width = 0
    let height = 0
    let stars: Star[] = []
    let raf = 0

    const seed = (): Star => ({
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      z: Math.random() * width,
      size: Math.random() * 1.2 + 0.3,
      hue: pickHue(),
    })

    const resize = () => {
      const parent = canvas.parentElement
      width = parent?.clientWidth ?? window.innerWidth
      height = parent?.clientHeight ?? window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.floor(width * height * density)
      stars = Array.from({ length: count }, seed)
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height)
      const cx = width / 2
      const cy = height / 2
      for (const s of stars) {
        const k = 128 / s.z
        const px = cx + s.x * k
        const py = cy + s.y * k
        if (px < 0 || px > width || py < 0 || py > height) continue
        const r = Math.max(s.size * (1 - s.z / width) * 1.4, 0.3)
        ctx.beginPath()
        ctx.fillStyle = `rgba(${COLORS[s.hue]},0.5)`
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      const cx = width / 2
      const cy = height / 2
      for (const s of stars) {
        s.z -= speed * width * 0.016
        if (s.z < 1) {
          Object.assign(s, seed(), { z: width })
        }
        const k = 128 / s.z
        const px = cx + s.x * k
        const py = cy + s.y * k
        if (px < 0 || px > width || py < 0 || py > height) continue
        const depth = 1 - s.z / width
        const r = Math.max(s.size * depth * 1.6, 0.3)
        const alpha = Math.min(depth * 0.85, 0.7)
        ctx.beginPath()
        ctx.fillStyle = `rgba(${COLORS[s.hue]},${alpha})`
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(render)
    }

    resize()
    if (reduced) {
      drawStatic()
    } else {
      raf = requestAnimationFrame(render)
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
      } else if (!reduced) {
        raf = requestAnimationFrame(render)
      }
    }

    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [density, speed])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
