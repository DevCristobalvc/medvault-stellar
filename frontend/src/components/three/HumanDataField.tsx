import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const BLUE = '#1B4FD8'
const GOLD = '#E0A200'

interface FieldProps {
  progress?: { current: number }
}

const CANVAS_W = 220
const CANVAS_H = 360

function sampleCanvas(draw: (ctx: CanvasRenderingContext2D) => void, count: number): Float32Array {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  const out = new Float32Array(count * 3)
  if (!ctx) return out

  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  draw(ctx)

  const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data
  const pts: number[] = []
  for (let y = 0; y < CANVAS_H; y += 1) {
    for (let x = 0; x < CANVAS_W; x += 1) {
      if (data[(y * CANVAS_W + x) * 4 + 3] > 128) {
        pts.push(x, y)
      }
    }
  }

  const scale = 3.4
  const aspect = CANVAS_W / CANVAS_H
  const n = pts.length / 2
  for (let i = 0; i < count; i += 1) {
    const idx = (Math.floor(Math.random() * n) | 0) * 2
    out[i * 3] = (pts[idx] / CANVAS_W - 0.5) * scale * aspect
    out[i * 3 + 1] = (0.5 - pts[idx + 1] / CANVAS_H) * scale
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.5
  }
  return out
}

function drawHuman(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.arc(110, 52, 28, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineWidth = 36
  ctx.beginPath()
  ctx.moveTo(110, 84)
  ctx.lineTo(110, 210)
  ctx.stroke()

  ctx.lineWidth = 20
  ctx.beginPath()
  ctx.moveTo(110, 104)
  ctx.lineTo(64, 150)
  ctx.lineTo(58, 214)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(110, 104)
  ctx.lineTo(156, 150)
  ctx.lineTo(162, 214)
  ctx.stroke()

  ctx.lineWidth = 24
  ctx.beginPath()
  ctx.moveTo(110, 206)
  ctx.lineTo(88, 282)
  ctx.lineTo(86, 346)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(110, 206)
  ctx.lineTo(132, 282)
  ctx.lineTo(134, 346)
  ctx.stroke()
}

function sampleHuman(count: number): Float32Array {
  return sampleCanvas(drawHuman, count)
}

function sampleData(count: number): Float32Array {
  const out = new Float32Array(count * 3)
  const turns = 3.2
  const radius = 0.62
  const height = 3.2
  for (let i = 0; i < count; i += 1) {
    const t = i / count
    if (i % 6 === 0) {
      const rr = 1.15 + Math.random() * 1.0
      const a = Math.random() * Math.PI * 2
      out[i * 3] = Math.cos(a) * rr
      out[i * 3 + 1] = (Math.random() - 0.5) * (height + 0.6)
      out[i * 3 + 2] = Math.sin(a) * rr * 0.55
      continue
    }
    const strand = i % 2
    const ang = t * turns * Math.PI * 2 + strand * Math.PI
    out[i * 3] = Math.cos(ang) * radius + (Math.random() - 0.5) * 0.04
    out[i * 3 + 1] = (t - 0.5) * height + (Math.random() - 0.5) * 0.04
    out[i * 3 + 2] = Math.sin(ang) * radius + (Math.random() - 0.5) * 0.04
  }
  return out
}

const gauss = (u: number, c: number, w: number) => Math.exp(-(((u - c) / w) ** 2))

function ekg(u: number): number {
  return (
    0.12 * gauss(u, 0.2, 0.028) -
    0.1 * gauss(u, 0.29, 0.01) +
    1.0 * gauss(u, 0.32, 0.009) -
    0.24 * gauss(u, 0.35, 0.012) +
    0.22 * gauss(u, 0.52, 0.045)
  )
}

function sampleHeartline(count: number): { pos: Float32Array; lineX: Float32Array } {
  const pos = new Float32Array(count * 3)
  const lineX = new Float32Array(count)
  const width = 4.8
  const beats = 3
  const ampY = 1.15
  for (let i = 0; i < count; i += 1) {
    if (i % 9 === 0) {
      const x01 = Math.random()
      pos[i * 3] = (x01 - 0.5) * width
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2.4
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.6
      lineX[i] = x01
      continue
    }
    const x01 = i / count
    const u = (x01 * beats) % 1
    pos[i * 3] = (x01 - 0.5) * width + (Math.random() - 0.5) * 0.012
    pos[i * 3 + 1] = ekg(u) * ampY + (Math.random() - 0.5) * 0.05
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.18
    lineX[i] = x01
  }
  return { pos, lineX }
}

const vertexShader = `
uniform float uTime;
uniform float uProgress;
uniform vec2 uPointer;
uniform float uPointerRadius;
uniform float uPointerStrength;
uniform float uSize;
uniform float uPixelRatio;
attribute vec3 aData;
attribute vec3 aGlyph;
attribute float aSeed;
attribute float aLineX;
varying float vMix;
varying float vAlpha;
varying float vSweep;

void main() {
  float seg = uProgress * 2.0;
  float s0 = smoothstep(0.0, 1.0, clamp(seg, 0.0, 1.0));
  float s1 = smoothstep(0.0, 1.0, clamp(seg - 1.0, 0.0, 1.0));
  vec3 pos = mix(mix(position, aData, s0), aGlyph, s1);

  float lineStage = s0 * (1.0 - s1);
  float head = fract(uTime * 0.16);
  float dx = head - aLineX;
  float band = step(0.0, dx) * step(dx, 0.14) * (1.0 - dx / 0.14);
  vSweep = band * lineStage;

  float br = sin(uTime * 1.4 + aSeed * 6.2831);
  pos += normalize(pos + 0.0001) * br * 0.045 * (1.0 - s0);
  pos.x += sin(uTime * 0.5 + aSeed * 12.0) * 0.024 * (1.0 - s1 * 0.7) * (1.0 - lineStage * 0.7);
  pos.y += cos(uTime * 0.45 + aSeed * 9.0) * 0.024 * (1.0 - s1 * 0.7) * (1.0 - lineStage * 0.7);

  vec2 d = pos.xy - uPointer;
  float dist = length(d);
  float infl = smoothstep(uPointerRadius, 0.0, dist);
  pos.xy += normalize(d + 0.0001) * infl * uPointerStrength;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(uSize * uPixelRatio * (1.0 / -mv.z) * (1.0 + vSweep * 0.8), 1.0);

  vMix = clamp(uProgress * 0.8 + aSeed * 0.35, 0.0, 1.0);
  vAlpha = mix(0.95, 0.82, s0);
}
`

const fragmentShader = `
precision mediump float;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vMix;
varying float vAlpha;
varying float vSweep;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = mix(uColorA, uColorB, vMix);
  col = mix(col, vec3(1.0), vSweep * 0.55);
  gl_FragColor = vec4(col, a * (vAlpha + vSweep * 0.5));
}
`

function Field({ progress }: FieldProps) {
  const points = useRef<THREE.Points>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)

  const count = useMemo(
    () => (typeof window !== 'undefined' && window.innerWidth < 640 ? 3800 : 7200),
    []
  )

  const { human, data, dna, seeds, lineX } = useMemo(() => {
    const seedArr = new Float32Array(count)
    for (let i = 0; i < count; i += 1) seedArr[i] = Math.random()
    const hl = sampleHeartline(count)
    return {
      human: sampleHuman(count),
      data: hl.pos,
      dna: sampleData(count),
      seeds: seedArr,
      lineX: hl.lineX,
    }
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerRadius: { value: 0.85 },
      uPointerStrength: { value: 0.45 },
      uSize: { value: typeof window !== 'undefined' && window.innerWidth < 640 ? 7.5 : 9.5 },
      uPixelRatio: {
        value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1,
      },
      uColorA: { value: new THREE.Color(BLUE) },
      uColorB: { value: new THREE.Color(GOLD) },
    }),
    []
  )

  useFrame((state, delta) => {
    const m = mat.current
    if (m) {
      m.uniforms.uTime.value += delta
      const target = progress?.current ?? 0
      m.uniforms.uProgress.value += (target - m.uniforms.uProgress.value) * 0.07
      m.uniforms.uPointer.value.set(state.pointer.x * 1.7, state.pointer.y * 1.15)
    }
    const p = points.current
    if (p) {
      const e = m ? m.uniforms.uProgress.value : 0
      const s0 = THREE.MathUtils.clamp(e * 2, 0, 1)
      const s1 = THREE.MathUtils.clamp(e * 2 - 1, 0, 1)
      const lineStage = s0 * (1 - s1)
      const spin = 1 - lineStage
      p.rotation.y += delta * (0.06 + 0.5 * spin)
      p.rotation.y = THREE.MathUtils.lerp(p.rotation.y, 0, 0.06 * lineStage)
      p.rotation.x = THREE.MathUtils.lerp(p.rotation.x, state.pointer.y * 0.18 * spin, 0.04)
    }
  })

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[human, 3]} />
        <bufferAttribute attach="attributes-aData" args={[data, 3]} />
        <bufferAttribute attach="attributes-aGlyph" args={[dna, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aLineX" args={[lineX, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}

export default function HumanDataField({ progress }: FieldProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <Field progress={progress} />
    </Canvas>
  )
}
