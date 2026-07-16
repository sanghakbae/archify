import { useEffect, useState } from 'react'
import ChatPanel from './components/ChatPanel'
import DiagramView, { type DiagramLook } from './components/DiagramView'
import SettingsDialog, { type Settings } from './components/SettingsDialog'
import { parseMessage } from './lib/parser'
import { generateWithLlm } from './lib/llm'
import { toMermaid } from './lib/diagram'
import { emptyDiagram, type ChatMessage, type Diagram } from './types'

const STORAGE_KEY = 'archify.state.v1'
const SETTINGS_KEY = 'archify.settings.v1'

interface PersistedState {
  diagram: Diagram
  messages: ChatMessage[]
  look?: DiagramLook
  rawCode?: string | null
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text:
    "Hi! I'm **Archify**. Describe your system in plain language and I'll draw the architecture.\n" +
    'Try “a React frontend talking to a Node API with a Postgres database”, or use commands like ' +
    '`connect X to Y`, `remove the cache`, `layout left to right`, or `clear`.\n' +
    'You can also switch to **Mermaid code** mode above to paste your own diagram.',
  ts: 0,
}

let idSeq = 0
const newId = () => `m${idSeq++}_${Math.floor(performance.now())}`

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { diagram: emptyDiagram(), messages: [WELCOME] }
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { useLlm: false, apiKey: '', model: 'claude-sonnet-5' }
}

export default function App() {
  const initial = loadState()
  const [diagram, setDiagram] = useState<Diagram>(initial.diagram)
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages)
  const [look, setLook] = useState<DiagramLook>(initial.look ?? 'clean')
  const [rawCode, setRawCode] = useState<string | null>(initial.rawCode ?? null)
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diagram, messages, look, rawCode }))
  }, [diagram, messages, look, rawCode])

  const addMessage = (role: ChatMessage['role'], text: string) =>
    setMessages((prev) => [...prev, { id: newId(), role, text, ts: Date.now() }])

  const handleSend = async (text: string) => {
    setRawCode(null) // returning to model-driven view
    addMessage('user', text)
    setBusy(true)

    const useLlm = settings.useLlm && settings.apiKey.trim().length > 0
    try {
      if (useLlm) {
        const result = await generateWithLlm(text, diagram, {
          apiKey: settings.apiKey.trim(),
          model: settings.model,
        })
        setDiagram(result.diagram)
        addMessage('assistant', result.reply)
      } else {
        // Small delay so the typing indicator is perceptible.
        await new Promise((r) => setTimeout(r, 180))
        const result = parseMessage(text, diagram)
        setDiagram(result.diagram)
        addMessage('assistant', result.reply)
      }
    } catch (err: any) {
      addMessage(
        'assistant',
        `⚠️ ${settings.useLlm ? 'Claude API request failed' : 'Something went wrong'}: ${
          err?.message ?? err
        }\n\nFalling back to the built-in parser for this message.`,
      )
      try {
        const result = parseMessage(text, diagram)
        setDiagram(result.diagram)
        addMessage('assistant', result.reply)
      } catch { /* ignore */ }
    } finally {
      setBusy(false)
    }
  }

  const handleRenderMermaid = (code: string) => setRawCode(code)

  const resetAll = () => {
    if (!confirm('Clear the diagram and chat history?')) return
    setDiagram(emptyDiagram())
    setMessages([WELCOME])
    setRawCode(null)
  }

  // What the canvas renders: pasted Mermaid code takes precedence over the model.
  const isRaw = rawCode !== null
  const code = isRaw ? (rawCode as string) : toMermaid(diagram)
  const title = isRaw ? 'Pasted Mermaid' : diagram.title
  const nodeCount = isRaw ? 0 : diagram.nodes.length
  const edgeCount = isRaw ? 0 : diagram.edges.length

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__logo">🧩</span>
          <div>
            <h1>Archify</h1>
            <p>Chat your way to an architecture diagram</p>
          </div>
        </div>
        <div className="topbar__actions">
          <span className={`mode ${settings.useLlm && settings.apiKey ? 'mode--ai' : 'mode--local'}`}>
            {settings.useLlm && settings.apiKey ? '✨ Claude AI' : '⚡ Local parser'}
          </span>
          <button onClick={() => setShowSettings(true)}>Settings</button>
          <button onClick={resetAll}>Reset</button>
        </div>
      </header>

      <main className="layout">
        <ChatPanel
          messages={messages}
          busy={busy}
          onSend={handleSend}
          onRenderMermaid={handleRenderMermaid}
        />
        <DiagramView
          code={code}
          title={title}
          nodeCount={nodeCount}
          edgeCount={edgeCount}
          look={look}
          onLookChange={setLook}
        />
      </main>

      {showSettings && (
        <SettingsDialog
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={(s) => {
            setSettings(s)
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
            setShowSettings(false)
          }}
        />
      )}
    </div>
  )
}
