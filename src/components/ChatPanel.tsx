import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  busy: boolean
  onSend: (text: string) => void
}

const EXAMPLES = [
  'A web app with a React frontend, Node backend and Postgres database',
  'Add a Redis cache and a Kafka queue',
  'Microservices: API gateway, auth service, orders service, payments service',
  'Connect frontend to backend',
  'Make the layout left to right',
]

export default function ChatPanel({ messages, busy, onSend }: Props) {
  const [text, setText] = useState('')
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <section className="chat">
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
