import type { Diagram, DiagramNode, NodeKind } from '../types'

/** Visual + semantic metadata for each node kind. */
export const KIND_META: Record<
  NodeKind,
  { icon: string; label: string; fill: string; stroke: string; text: string; shape: [string, string] }
> = {
  frontend: { icon: '🖥️', label: 'Frontend', fill: '#e0f2fe', stroke: '#0284c7', text: '#0c4a6e', shape: ['[', ']'] },
  backend: { icon: '⚙️', label: 'Backend', fill: '#ede9fe', stroke: '#7c3aed', text: '#4c1d95', shape: ['[', ']'] },
  api: { icon: '🔌', label: 'API', fill: '#f0fdfa', stroke: '#0d9488', text: '#134e4a', shape: ['([', '])'] },
  database: { icon: '🗄️', label: 'Database', fill: '#dcfce7', stroke: '#16a34a', text: '#14532d', shape: ['[(', ')]'] },
  cache: { icon: '⚡', label: 'Cache', fill: '#fef9c3', stroke: '#ca8a04', text: '#713f12', shape: ['[(', ')]'] },
  queue: { icon: '📬', label: 'Queue', fill: '#ffedd5', stroke: '#ea580c', text: '#7c2d12', shape: ['[/', '/]'] },
  storage: { icon: '📦', label: 'Storage', fill: '#e2e8f0', stroke: '#475569', text: '#1e293b', shape: ['[(', ')]'] },
  service: { icon: '🧩', label: 'Service', fill: '#fce7f3', stroke: '#db2777', text: '#831843', shape: ['[', ']'] },
  gateway: { icon: '🚪', label: 'Gateway', fill: '#cffafe', stroke: '#0891b2', text: '#164e63', shape: ['{{', '}}'] },
  auth: { icon: '🔐', label: 'Auth', fill: '#fae8ff', stroke: '#a21caf', text: '#701a75', shape: ['[', ']'] },
  external: { icon: '🌐', label: 'External', fill: '#f1f5f9', stroke: '#64748b', text: '#334155', shape: ['[/', '/]'] },
  user: { icon: '👤', label: 'User', fill: '#fee2e2', stroke: '#dc2626', text: '#7f1d1d', shape: ['((', '))'] },
  generic: { icon: '📄', label: 'Component', fill: '#f8fafc', stroke: '#94a3b8', text: '#334155', shape: ['[', ']'] },
}

const escapeLabel = (s: string) => s.replace(/"/g, '&quot;').replace(/\n/g, ' ')

function nodeLine(node: DiagramNode): string {
  const meta = KIND_META[node.kind]
  const [open, close] = meta.shape
  const text = `${meta.icon} ${escapeLabel(node.label)}`
  return `  ${node.id}${open}"${text}"${close}`
}

/** Convert the diagram model into a mermaid flowchart definition. */
export function toMermaid(diagram: Diagram): string {
  const lines: string[] = []
  lines.push(`flowchart ${diagram.direction}`)

  if (diagram.nodes.length === 0) {
    lines.push('  empty["채팅에서 시스템을 설명해 주세요 →"]')
    lines.push('  style empty fill:#f8fafc,stroke:#cbd5e1,stroke-dasharray: 5 5,color:#64748b')
    return lines.join('\n')
  }

  for (const node of diagram.nodes) lines.push(nodeLine(node))

  for (const edge of diagram.edges) {
    const label = edge.label ? `|"${escapeLabel(edge.label)}"|` : ''
    lines.push(`  ${edge.from} -->${label} ${edge.to}`)
  }

  // Per-node styling by kind.
  for (const node of diagram.nodes) {
    const m = KIND_META[node.kind]
    lines.push(
      `  style ${node.id} fill:${m.fill},stroke:${m.stroke},stroke-width:2px,color:${m.text}`,
    )
  }

  return lines.join('\n')
}
