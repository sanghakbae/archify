import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  busy: boolean
  onSend: (text: string) => void
  onRenderMermaid: (code: string) => void
}

const EXAMPLES = [
  'A web app with a React frontend, Node backend and Postgres database',
  'Add a Redis cache and a Kafka queue',
  'Microservices: API gateway, auth service, orders service, payments service',
  'Connect frontend to backend',
  'Make the layout left to right',
]

const SAMPLE_MERMAID = `flowchart TB
  user["👤 User"] --> web["🖥️ Web App"]
  web --> api["🔌 API"]
  api --> db[("🗄️ Database")]
  api --> cache[("⚡ Redis")]`

type Mode = 'chat' | 'mermaid'

export default function ChatPanel({ messages, busy, onSend, onRenderMermaid }: Props) {
  const [mode, setMode] = useState<Mode>('chat')
  const [text, setText] = useState('')
  const [code, setCode] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const submit = () => {
    const t = text.trim()
    if (!t || busy) return
    onSend(t)
    setText('')
    taRef.current?.focus()
  }

  const renderCode = () => {
    const c = code.trim()
    if (!c) return
    onRenderMermaid(c)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <section className="chat">
      <div className="mode-tabs">
        <button className={mode === 'chat' ? 'is-active' : ''} onClick={() => setMode('chat')}>
          💬 Chat
        </button>
        <button className={mode === 'mermaid' ? 'is-active' : ''} onClick={() => setMode('mermaid')}>
          {'</>'} Mermaid code
        </button>
      </div>

      {mode === 'chat' ? (
        <>
          <div className="chat__list" ref={listRef}>
            {messages.map((m) => (
              <div key={m.id} className={`msg msg--${m.role}`}>
                <div className="msg__avatar">{m.role === 'user' ? '🧑' : '🧩'}</div>
                <div className="msg__bubble">
                  {m.text.split('\n').map((line, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: mdInline(line) }} />
                  ))}
                </div>
              </div>
            ))}
            {busy && (
              <div className="msg msg--assistant">
                <div className="msg__avatar">🧩</div>
                <div className="msg__bubble msg__bubble--typing">
                  <span /> <span /> <span />
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="chat__examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => onSend(ex)} disabled={busy}>
                  {ex}
                </button>
              ))}
            </div>
          )}

          <div className="chat__composer">
            <textarea
              ref={taRef}
              value={text}
              rows={1}
              placeholder="Describe your architecture, or type a command…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button className="btn-primary" onClick={submit} disabled={busy || !text.trim()}>
              Send
            </button>
          </div>
        </>
      ) : (
        <div className="code-mode">
          <p className="code-mode__hint">
            Paste any <strong>Mermaid</strong> diagram code below and render it with the styled canvas
            (Clean or Sketch look, zoom, export).
          </p>
          <textarea
            className="code-mode__editor"
            value={code}
            spellCheck={false}
            placeholder={SAMPLE_MERMAID}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="code-mode__actions">
            <button onClick={() => setCode(SAMPLE_MERMAID)}>Insert sample</button>
            <button className="btn-primary" onClick={renderCode} disabled={!code.trim()}>
              Render diagram
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

/** Tiny inline markdown: **bold** and `code`. Input is escaped first. */
function mdInline(s: string): string {
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}
