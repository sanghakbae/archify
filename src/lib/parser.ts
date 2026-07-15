import type { Diagram, DiagramNode, Direction, NodeKind } from '../types'
import { KIND_META } from './diagram'

export interface ParseResult {
  diagram: Diagram
  reply: string
  changed: boolean
}

/** Keyword → node kind. Order matters: earlier, more specific entries win. */
const KIND_KEYWORDS: Array<[NodeKind, string[]]> = [
  ['user', ['user', 'customer', 'visitor', 'browser', 'client app', 'end user', 'people']],
  ['frontend', ['frontend', 'front-end', 'front end', 'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'spa', 'web app', 'webapp', 'website', 'web ui', 'ui', 'mobile app', 'ios', 'android', 'flutter']],
  ['gateway', ['api gateway', 'gateway', 'load balancer', 'loadbalancer', 'nginx', 'reverse proxy', 'ingress', 'cloudfront', 'cdn', 'proxy']],
  ['auth', ['auth', 'authentication', 'oauth', 'jwt', 'cognito', 'keycloak', 'identity', 'sso', 'login service']],
  ['api', ['rest api', 'graphql', 'grpc', 'api server', ' api', 'endpoint']],
  ['queue', ['queue', 'kafka', 'rabbitmq', 'rabbit mq', 'sqs', 'message broker', 'message bus', 'pubsub', 'pub/sub', 'event bus', 'nats']],
  ['cache', ['cache', 'redis', 'memcached', 'caching']],
  ['database', ['database', 'postgres', 'postgresql', 'mysql', 'mariadb', 'mongodb', 'mongo', 'dynamodb', 'sqlite', 'cassandra', 'cockroach', 'sql', ' db', 'datastore', 'data store']],
  ['storage', ['object storage', 's3', 'blob storage', 'bucket', 'file storage', 'storage', 'data lake', 'gcs']],
  ['external', ['third party', 'third-party', '3rd party', 'external service', 'external api', 'stripe', 'twilio', 'sendgrid', 'payment gateway', 'payment provider', 'webhook']],
  ['backend', ['backend', 'back-end', 'back end', 'server', 'node', 'express', 'django', 'flask', 'fastapi', 'rails', 'spring', 'go service', 'microservice', 'monolith', 'worker', 'lambda', 'function']],
  ['service', ['service', 'module', 'component', 'processor', 'engine']],
]

const STOPWORDS = new Set([
  'a', 'an', 'the', 'my', 'our', 'some', 'new', 'with', 'and', 'to', 'for', 'of', 'that',
  'this', 'it', 'please', 'add', 'create', 'make', 'build', 'insert', 'put', 'named', 'called',
  'want', 'need', 'like', 'would', 'i', 'we',
])

function detectKind(text: string): NodeKind {
  const t = ` ${text.toLowerCase()} `
  for (const [kind, words] of KIND_KEYWORDS) {
    for (const w of words) {
      if (t.includes(w.toLowerCase())) return kind
    }
  }
  return 'generic'
}

function slugify(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base || 'node'
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = base
  let n = 2
  while (taken.has(id)) id = `${base}_${n++}`
  taken.add(id)
  return id
}

const FILLER = new Set(['a', 'an', 'the', 'some', 'new', 'my', 'our', 'with', 'that', 'of', 'for', 'to', 'and', 'as'])
const ACRONYMS = new Set(['api', 'db', 'sql', 'ui', 'cdn', 'sso', 'jwt', 'lb', 'cqrs', 's3', 'gcs', 'nats', 'grpc', 'ios', 'aws', 'gcp'])

/** Turn a raw phrase into a clean display label. */
function cleanLabel(phrase: string, kind: NodeKind): string {
  const words = phrase
    .replace(/[.,;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !FILLER.has(w.toLowerCase()))
    .map((w) => {
      const lower = w.toLowerCase()
      if (ACRONYMS.has(lower)) return w.toUpperCase()
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
  const p = words.join(' ')
  return p || KIND_META[kind].label
}

function findNode(diagram: Diagram, query: string): DiagramNode | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  const qslug = slugify(q)
  // Exact id / label first, then partial.
  return (
    diagram.nodes.find((n) => n.id === qslug || n.label.toLowerCase() === q) ??
    diagram.nodes.find((n) => n.label.toLowerCase().includes(q) || q.includes(n.label.toLowerCase())) ??
    diagram.nodes.find((n) => n.id.includes(qslug))
  )
}

function clone(d: Diagram): Diagram {
  return { ...d, nodes: d.nodes.map((n) => ({ ...n })), edges: d.edges.map((e) => ({ ...e })) }
}

let edgeCounter = 0
const edgeId = () => `e${Date.now().toString(36)}_${edgeCounter++}`

function addEdge(d: Diagram, from: string, to: string, label?: string): boolean {
  if (from === to) return false
  if (d.edges.some((e) => e.from === from && e.to === to)) return false
  d.edges.push({ id: edgeId(), from, to, label })
  return true
}

/** Split a description into candidate component phrases. */
function splitComponents(text: string): string[] {
  return text
    .replace(/\bconnected to\b|\btalks to\b|\bcommunicates with\b|\bsends? to\b|\bwrites? to\b|\breads? from\b/gi, ',')
    .split(/,|\band\b|\bthen\b|->|→|\+|\/|\n/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

/** The kind-ordering used to auto-wire a fresh architecture. */
const SPINE: NodeKind[] = ['user', 'frontend', 'gateway', 'auth', 'api', 'backend', 'service']
const LEAVES: NodeKind[] = ['database', 'cache', 'queue', 'storage', 'external']

/** The spine node that data-stores should hang off of (backend-most first). */
function spineAnchor(nodes: DiagramNode[]): DiagramNode | undefined {
  const order = [...SPINE].reverse() // service, backend, api, auth, gateway, frontend, user
  for (const kind of order) {
    const hit = nodes.find((n) => n.kind === kind)
    if (hit) return hit
  }
  return undefined
}

function autoWire(d: Diagram, newIds: string[]): number {
  const fresh = d.nodes.filter((n) => newIds.includes(n.id))
  const existing = d.nodes.filter((n) => !newIds.includes(n.id))
  const freshSpine = SPINE.map((k) => fresh.find((n) => n.kind === k)).filter(Boolean) as DiagramNode[]
  let count = 0

  // Chain new spine nodes together (user → frontend → … → backend).
  for (let i = 0; i < freshSpine.length - 1; i++) {
    if (addEdge(d, freshSpine[i].id, freshSpine[i + 1].id)) count++
  }

  // Link the first new spine node into any existing spine.
  if (freshSpine.length && existing.length) {
    const prior = spineAnchor(existing)
    if (prior && addEdge(d, prior.id, freshSpine[0].id)) count++
  }

  // Data stores attach to the deepest spine node (new or pre-existing).
  const anchor = freshSpine[freshSpine.length - 1] ?? spineAnchor(existing) ?? fresh[0]
  if (anchor) {
    for (const leaf of fresh.filter((n) => LEAVES.includes(n.kind) && n.id !== anchor.id)) {
      if (addEdge(d, anchor.id, leaf.id)) count++
    }
  }

  // No spine anywhere: chain fresh non-leaf nodes in stated order.
  if (freshSpine.length === 0 && !spineAnchor(existing) && fresh.length > 1) {
    const chain = fresh.filter((n) => !LEAVES.includes(n.kind))
    for (let i = 0; i < chain.length - 1; i++) {
      if (addEdge(d, chain[i].id, chain[i + 1].id)) count++
    }
  }
  return count
}

// ---------------------------------------------------------------------------
// Intent handlers
// ---------------------------------------------------------------------------

function handleClear(): ParseResult {
  return {
    diagram: { title: 'Untitled Architecture', direction: 'TB', nodes: [], edges: [] },
    reply: 'Cleared the canvas. Describe a new system whenever you are ready. 🧹',
    changed: true,
  }
}

function handleDirection(d: Diagram, msg: string): ParseResult | null {
  let dir: Direction | null = null
  if (/\b(horizontal|left to right|lr|side by side)\b/i.test(msg)) dir = 'LR'
  else if (/\b(vertical|top to bottom|tb|top down|stacked)\b/i.test(msg)) dir = 'TB'
  if (!dir) return null
  const next = clone(d)
  next.direction = dir
  return { diagram: next, reply: `Switched the layout to ${dir === 'LR' ? 'left‑to‑right' : 'top‑to‑bottom'}.`, changed: true }
}

function handleTitle(d: Diagram, msg: string): ParseResult | null {
  const m = msg.match(/(?:title|name|call)\s+(?:the\s+)?(?:diagram|it)\s+(?:as\s+|to\s+)?["']?(.+?)["']?$/i)
  if (!m) return null
  const next = clone(d)
  next.title = m[1].trim()
  return { diagram: next, reply: `Renamed the diagram to “${next.title}”.`, changed: true }
}

function handleRemove(d: Diagram, msg: string): ParseResult | null {
  const m = msg.match(/^(?:remove|delete|drop)\s+(?:the\s+)?(.+)$/i)
  if (!m) return null
  const next = clone(d)
  const removed: string[] = []
  for (const raw of splitComponents(m[1])) {
    const node = findNode(next, raw)
    if (node) {
      next.nodes = next.nodes.filter((n) => n.id !== node.id)
      next.edges = next.edges.filter((e) => e.from !== node.id && e.to !== node.id)
      removed.push(node.label)
    }
  }
  if (removed.length === 0) return { diagram: d, reply: `I couldn't find “${m[1].trim()}” on the canvas.`, changed: false }
  return { diagram: next, reply: `Removed ${removed.map((r) => `**${r}**`).join(', ')}.`, changed: true }
}

function handleRename(d: Diagram, msg: string): ParseResult | null {
  const m = msg.match(/^rename\s+(.+?)\s+to\s+(.+)$/i)
  if (!m) return null
  const node = findNode(d, m[1])
  if (!node) return { diagram: d, reply: `I couldn't find “${m[1].trim()}” to rename.`, changed: false }
  const next = clone(d)
  const target = next.nodes.find((n) => n.id === node.id)!
  const old = target.label
  target.label = cleanLabel(m[2], target.kind)
  return { diagram: next, reply: `Renamed **${old}** to **${target.label}**.`, changed: true }
}

function handleConnect(d: Diagram, msg: string): ParseResult | null {
  // Patterns: "connect A to B", "link A and B", "A -> B", "A → B [labeled X]"
  const isConnect = /^(connect|link|wire|join)\b/i.test(msg) || /->|→/.test(msg)
  if (!isConnect) return null

  let label: string | undefined
  const labelMatch = msg.match(/\s+(?:labell?ed|with label|as|via|through|using)\s+["']?(.+?)["']?$/i)
  let body = msg
  if (labelMatch) {
    label = labelMatch[1].trim()
    body = msg.slice(0, labelMatch.index).trim()
  }
  body = body.replace(/^(connect|link|wire|join)\b/i, '').trim()

  const parts = body
    .split(/->|→|\bto\b|\bwith\b|\band\b|,/gi)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length < 2) return null

  const next = clone(d)
  const created: string[] = []
  const takenIds = new Set(next.nodes.map((n) => n.id))
  const resolve = (name: string): DiagramNode => {
    const existing = findNode(next, name)
    if (existing) return existing
    const kind = detectKind(name)
    const node: DiagramNode = { id: uniqueId(slugify(name), takenIds), label: cleanLabel(name, kind), kind }
    next.nodes.push(node)
    created.push(node.label)
    return node
  }

  let links = 0
  for (let i = 0; i < parts.length - 1; i++) {
    const a = resolve(parts[i])
    const b = resolve(parts[i + 1])
    if (addEdge(next, a.id, b.id, label)) links++
  }
  if (links === 0 && created.length === 0)
    return { diagram: d, reply: 'Those components are already connected.', changed: false }

  let reply = `Connected ${parts.map((p) => `**${cleanLabel(p, 'generic')}**`).join(' → ')}`
  reply += label ? ` with label “${label}”.` : '.'
  if (created.length) reply += ` (Created ${created.map((c) => `**${c}**`).join(', ')} along the way.)`
  return { diagram: next, reply, changed: true }
}

/** Extract components from any description and add them, auto-wiring if sensible. */
function handleDescribe(d: Diagram, msg: string): ParseResult {
  const explicitConnections = /\bconnected to\b|\btalks to\b|\bcommunicates with\b|->|→|\bsends? to\b|\breads? from\b|\bwrites? to\b/i.test(
    msg,
  )
  const cleaned = msg.replace(/^(add|create|make|build|insert|put|i want|i need|let'?s add|please add|give me|design|set up|setup)\b/gi, '').trim()

  const next = clone(d)
  const takenIds = new Set(next.nodes.map((n) => n.id))
  const newIds: string[] = []
  const createdLabels: string[] = []

  for (const phrase of splitComponents(cleaned || msg)) {
    // Skip phrases that are clearly not components.
    const words = phrase.split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()))
    if (words.length === 0) continue
    const kind = detectKind(phrase)
    const label = cleanLabel(phrase, kind)
    // Avoid duplicates (same label already present).
    if (next.nodes.some((n) => n.label.toLowerCase() === label.toLowerCase())) continue
    const node: DiagramNode = { id: uniqueId(slugify(label), takenIds), label, kind }
    next.nodes.push(node)
    newIds.push(node.id)
    createdLabels.push(`${KIND_META[kind].icon} ${label}`)
  }

  if (newIds.length === 0) {
    return {
      diagram: d,
      reply:
        "I couldn't pull any components out of that. Try things like:\n" +
        '• “add a React frontend and a Node backend with a Postgres database”\n' +
        '• “connect frontend to backend”\n' +
        '• “remove the cache”',
      changed: false,
    }
  }

  let wired = 0
  if (explicitConnections) {
    wired += wireFromText(next, msg, takenIds)
  } else if (newIds.length > 1) {
    wired += autoWire(next, newIds)
  }

  let reply = `Added ${createdLabels.length} component${createdLabels.length > 1 ? 's' : ''}:\n`
  reply += createdLabels.map((c) => `• ${c}`).join('\n')
  if (wired > 0) reply += `\n\nAnd wired up ${wired} connection${wired > 1 ? 's' : ''}. ✨`
  else if (newIds.length > 1) reply += '\n\nTip: say “connect X to Y” to link them.'
  return { diagram: next, reply, changed: true }
}

/** Parse "A connected to B", "A -> B" phrases embedded in a longer description. */
function wireFromText(d: Diagram, msg: string, takenIds: Set<string>): number {
  let count = 0
  const connectRe = /([\w .'-]+?)\s*(?:->|→|connected to|talks to|communicates with|sends? to|reads? from|writes? to)\s*([\w .'-]+)/gi
  let m: RegExpExecArray | null
  while ((m = connectRe.exec(msg)) !== null) {
    const resolve = (name: string): DiagramNode | undefined => {
      const found = findNode(d, name.trim())
      if (found) return found
      const kind = detectKind(name)
      const label = cleanLabel(name, kind)
      if (!label) return undefined
      const node: DiagramNode = { id: uniqueId(slugify(label), takenIds), label, kind }
      d.nodes.push(node)
      return node
    }
    const a = resolve(m[1])
    const b = resolve(m[2])
    if (a && b && addEdge(d, a.id, b.id)) count++
  }
  return count
}

/**
 * Main entry point: interpret a user message against the current diagram and
 * return the next diagram plus a conversational reply.
 */
export function parseMessage(message: string, diagram: Diagram): ParseResult {
  const msg = message.trim()
  if (!msg) return { diagram, reply: 'Say something to get started!', changed: false }

  if (/^(clear|reset|start over|wipe|new diagram|delete everything)\b/i.test(msg)) return handleClear()

  return (
    handleDirection(diagram, msg) ??
    handleTitle(diagram, msg) ??
    handleRename(diagram, msg) ??
    handleRemove(diagram, msg) ??
    handleConnect(diagram, msg) ??
    handleDescribe(diagram, msg)
  )
}
