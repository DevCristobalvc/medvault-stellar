import { useEffect, useRef, useState } from 'react'
import type { Mermaid } from 'mermaid'

interface MermaidDiagramProps {
  chart: string
  id: string
}

let mermaidPromise: Promise<Mermaid> | null = null

function loadMermaid(): Promise<Mermaid> {
  if (mermaidPromise) return mermaidPromise
  mermaidPromise = import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      themeVariables: {
        primaryColor: '#1B4FD8',
        primaryTextColor: '#0A0A0A',
        primaryBorderColor: '#E5E5E5',
        lineColor: '#6B6B6B',
        secondaryColor: '#F5F5F5',
        tertiaryColor: '#F5BE00',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '13px',
      },
      flowchart: { curve: 'basis', htmlLabels: true },
      sequence: { useMaxWidth: true },
    })
    return mermaid
  })
  return mermaidPromise
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    let cancelled = false
    setFailed(false)

    const attempt = (mermaid: Mermaid, tries: number) => {
      mermaid
        .render(`mermaid-${id}-${tries}`, chart)
        .then(({ svg }) => {
          if (cancelled || !ref.current) return
          ref.current.innerHTML = svg
        })
        .catch(() => {
          if (cancelled) return
          if (tries < 3) {
            setTimeout(() => attempt(mermaid, tries + 1), 120 * (tries + 1))
          } else {
            setFailed(true)
          }
        })
    }

    const raf = requestAnimationFrame(() => {
      loadMermaid()
        .then((mermaid) => { if (!cancelled) attempt(mermaid, 0) })
        .catch(() => { if (!cancelled) setFailed(true) })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [chart, id])

  if (failed) return null

  return (
    <div
      ref={ref}
      className="w-full overflow-x-auto rounded-lg border border-border bg-background-soft p-4 [&_svg]:max-w-full [&_svg]:h-auto"
    />
  )
}
