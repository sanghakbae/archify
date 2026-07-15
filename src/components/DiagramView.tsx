import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import type { Diagram } from '../types'
import { toMermaid } from '../lib/diagram'

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'strict',
  flowchart: { curve: 'basis', htmlLabels: true, padding: 16 },
  themeVariables: {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '15px',
    lineColor: '#94a3b8',
    primaryColor: '#e2e8f0',
  },
})

interface Props {
  diagram: Diagram
}

let renderSeq = 0

export default function DiagramView({ diagram }: Props) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const code = toMermaid(diagram)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const id = `archify-svg-${renderSeq++}`
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e))
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const download = (type: 'svg' | 'png') => {
    if (!svg) return
    if (type === 'svg') {
      triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), `${slug(diagram.title)}.svg`)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => blob && triggerDownload(blob, `${slug(diagram.title)}.png`))
    }
    img.src = url
  }

  const copyCode = () => navigator.clipboard?.writeText(code)

  return (
    <section className="diagram">
      <header className="diagram__bar">
        <div className="diagram__title" title={diagram.title}>
          {diagram.title}
          <span className="diagram__meta">
            {diagram.nodes.length} node{diagram.nodes.length !== 1 ? 's' : ''} · {diagram.edges.length} link
            {diagram.edges.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="diagram__actions">
          <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))} title="Zoom out">−</button>
          <button onClick={() => setZoom(1)} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.15))} title="Zoom in">+</button>
          <span className="diagram__divider" />
          <button onClick={copyCode} title="Copy Mermaid source">Copy code</button>
          <button onClick={() => download('svg')} title="Download SVG">SVG</button>
          <button onClick={() => download('png')} className="btn-primary" title="Download PNG">PNG</button>
        </div>
      </header>
      <div className="diagram__canvas" ref={containerRef}>
        {error ? (
          <div className="diagram__error">
            <strong>Couldn't render this diagram.</strong>
            <pre>{error}</pre>
          </div>
        ) : (
          <div
            className="diagram__svg"
            style={{ transform: `scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </section>
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'architecture'
}
