import type { Diagram, DiagramEdge, DiagramNode, NodeKind } from '../types'
import { KIND_META } from './diagram'

export type Provider = 'openai' | 'anthropic'

export interface LlmConfig {
  provider: Provider
  apiKey: string
  model: string
}

const KINDS = Object.keys(KIND_META) as NodeKind[]

const SYSTEM_PROMPT = `You are Archify, an assistant that turns natural-language descriptions of software systems into architecture diagrams.

You maintain a single diagram. On every user message you return the FULL updated diagram (not a patch) plus a short, friendly reply describing what you changed.

Respond with ONLY a JSON object, no markdown fences, matching exactly:
{
  "reply": "one or two short sentences describing what you did",
  "diagram": {
    "title": "string",
    "direction": "TB" | "LR",
    "nodes": [{ "label": "Human Readable Name", "kind": "<one of the allowed kinds>" }],
    "edges": [{ "from": "Source Label", "to": "Target Label", "label": "optional edge text" }]
  }
}

Allowed node kinds: ${KINDS.join(', ')}.
- Use "user" for people/clients, "frontend" for web/mobile UIs, "gateway" for load balancers/API gateways/CDNs, "auth" for identity, "api"/"backend"/"service" for compute, "database"/"cache"/"queue"/"storage" for data, "external" for third-party services.
Edge "from"/"to" MUST reference existing node labels exactly. Keep labels concise. Merge new requests into the existing diagram rather than discarding it, unless the user asks to start over.`

function buildContext(diagram: Diagram): string {
  if (diagram.nodes.length === 0) return 'The current diagram is empty.'
  const nodes = diagram.nodes.map((n) => `- ${n.label} (${n.kind})`).join('\n')
  const edges = diagram.edges
    .map((e) => {
      const from = diagram.nodes.find((n) => n.id === e.from)?.label ?? e.from
      const to = diagram.nodes.find((n) => n.id === e.to)?.label ?? e.to
      return `- ${from} -> ${to}${e.label ? ` [${e.label}]` : ''}`
    })
    .join('\n')
  return `Current diagram "${diagram.title}" (direction ${diagram.direction}):\nNodes:\n${nodes}\nEdges:\n${edges || '(none)'}`
}

function userPrompt(message: string, diagram: Diagram): string {
  return `${buildContext(diagram)}\n\nUser request: ${message}`
}

function extractJson(text: string): any {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response.')
  return JSON.parse(trimmed.slice(start, end + 1))
}

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'node'
}

/** Coerce the model's label-based diagram into our id-based model. */
function normalize(raw: any): Diagram {
  const direction = raw?.diagram?.direction === 'LR' ? 'LR' : 'TB'
  const title = typeof raw?.diagram?.title === 'string' ? raw.diagram.title : 'Untitled Architecture'
  const labelToId = new Map<string, string>()
  const taken = new Set<string>()
  const nodes: DiagramNode[] = []
  for (const n of raw?.diagram?.nodes ?? []) {
    if (!n?.label) continue
    let id = slug(n.label)
    let i = 2
    while (taken.has(id)) id = `${slug(n.label)}_${i++}`
    taken.add(id)
    labelToId.set(String(n.label).toLowerCase(), id)
    const kind: NodeKind = KINDS.includes(n.kind) ? n.kind : 'generic'
    nodes.push({ id, label: String(n.label), kind })
  }
  const edges: DiagramEdge[] = []
  let c = 0
  for (const e of raw?.diagram?.edges ?? []) {
    const from = labelToId.get(String(e?.from ?? '').toLowerCase())
    const to = labelToId.get(String(e?.to ?? '').toLowerCase())
    if (!from || !to || from === to) continue
    if (edges.some((x) => x.from === from && x.to === to)) continue
    edges.push({ id: `le${c++}`, from, to, label: e?.label ? String(e.label) : undefined })
  }
  return { title, direction, nodes, edges }
}

export interface LlmResult {
  diagram: Diagram
  reply: string
}

async function callOpenAi(message: string, diagram: Diagram, config: LlmConfig): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(message, diagram) },
      ],
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`OpenAI API error ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

async function callAnthropic(message: string, diagram: Diagram, config: LlmConfig): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt(message, diagram) }],
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Claude API error ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  return (data?.content ?? []).map((b: any) => b?.text ?? '').join('')
}

export async function generateWithLlm(
  message: string,
  diagram: Diagram,
  config: LlmConfig,
): Promise<LlmResult> {
  const text =
    config.provider === 'anthropic'
      ? await callAnthropic(message, diagram, config)
      : await callOpenAi(message, diagram, config)
  const parsed = extractJson(text)
  return {
    diagram: normalize(parsed),
    reply: typeof parsed?.reply === 'string' ? parsed.reply : 'Updated the diagram.',
  }
}
