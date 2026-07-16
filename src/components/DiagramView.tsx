import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

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

export type DiagramLook = 'clean' | 'sketch'

interface Props {
  code: string
  title: string
  nodeCount: number
  edgeCount: number
  look: DiagramLook
  onLookChange: (look: DiagramLook) => void
}

let renderSeq = 0

/**
 * Prepend a Mermaid init directive so we can switch the rendering "look"
 * (classic vs hand-drawn) per render without re-initializing globally.
 * Skipped when the code already carries its own init directive.
 */
function withLook(code: string, look: DiagramLook): string {
  if (code.includes('%%{init')) return code
  const cfg = {
    look: look === 'sketch' ? 'handDrawn' : 'classic',
    handDrawnSeed: 1,
    theme: 'base',
    themeVariables: {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '15px',
      lineColor: look === 'sketch' ? '#64748b' : '#94a3b8',
    },
  }
  return `%%{init: ${JSON.stringify(cfg)}}%%\n${code}`
}

export default function DiagramView({ code, title, nodeCount, edgeCount, look, onLookChange }: Props) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const finalCode = withLook(code, look)

  useEffect(() => {
    let cancelled = false
    const id = `archify-svg-${renderSeq++}`
    mermaid
      .render(id, finalCode)
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
  }, [finalCode])

  const download = (type: 'svg' | 'png') => {
    if (!svg) return
    if (type === 'svg') {
      triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), `${slug(title)}.svg`)
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
      canvas.toBlob((blob) => blob && triggerDownload(blob, `${slug(title)}.png`))
    }
    img.src = url
  }

  const copyCode = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <section className="diagram">
      <header className="diagram__bar">
        <div className="diagram__title" title={title}>
          {title}
          <span className="diagram__meta">
            {nodeCount} node{nodeCount !== 1 ? 's' : ''} · {edgeCount} link{edgeCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="diagram__actions">
          <div className="look-toggle" role="group" aria-label="Diagram style">
            <button
              className={look === 'clean' ? 'is-active' : ''}
              onClick={() => onLookChange('clean')}
              title="Clean style"
            >
              ▢ Clean
            </button>
            <button
              className={look === 'sketch' ? 'is-active' : ''}
              onClick={() => onLookChange('sketch')}
              title="Hand-drawn style"
            >
              ✎ Sketch
            </button>
          </div>
          <span className="diagram__divider" />
          <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))} title="Zoom out">−</button>
          <button onClick={() => setZoom(1)} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.15))} title="Zoom in">+</button>
          <span className="diagram__divider" />
          <button onClick={copyCode} title="Copy Mermaid source">{copied ? '✓ Copied' : 'Copy code'}</button>
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
