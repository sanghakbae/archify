export type NodeKind =
  | 'frontend'
  | 'backend'
  | 'api'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'service'
  | 'gateway'
  | 'auth'
  | 'external'
  | 'user'
  | 'generic'

export interface DiagramNode {
  id: string
  label: string
  kind: NodeKind
}

export interface DiagramEdge {
  id: string
  from: string
  to: string
  label?: string
}

export type Direction = 'TB' | 'LR'

export interface Diagram {
  title: string
  direction: Direction
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  text: string
  ts: number
}

export const emptyDiagram = (): Diagram => ({
  title: 'Untitled Architecture',
  direction: 'TB',
  nodes: [],
  edges: [],
})
