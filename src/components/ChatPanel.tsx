import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  busy: boolean
  onSend: (text: string) => void
  onRenderMermaid: (code: string) => void
}

const EXAMPLES = [
  'React 프론트엔드, Node 백엔드, Postgres 데이터베이스로 구성된 웹 앱',
  'Redis 캐시와 Kafka 큐 추가',
  '마이크로서비스: API 게이트웨이, 인증 서비스, 주문 서비스, 결제 서비스',
  '프론트엔드를 백엔드에 연결',
  '레이아웃을 좌우로 바꿔줘',
]

const SAMPLE_MERMAID = `flowchart TB
  user["👤 사용자"] --> web["🖥️ 웹 앱"]
  web --> api["🔌 API"]
  api --> db[("🗄️ 데이터베이스")]
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
          💬 채팅
        </button>
        <button className={mode === 'mermaid' ? 'is-active' : ''} onClick={() => setMode('mermaid')}>
          {'</>'} Mermaid 코드
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
              placeholder="아키텍처를 설명하거나 명령을 입력하세요…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button className="btn-primary" onClick={submit} disabled={busy || !text.trim()}>
              보내기
            </button>
          </div>
        </>
      ) : (
        <div className="code-mode">
          <p className="code-mode__hint">
            아래에 <strong>Mermaid</strong> 다이어그램 코드를 붙여넣으면 스타일이 적용된 캔버스로
            렌더링합니다 (깔끔/손그림 스타일, 확대·축소, 내보내기 지원).
          </p>
          <textarea
            className="code-mode__editor"
            value={code}
            spellCheck={false}
            placeholder={SAMPLE_MERMAID}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="code-mode__actions">
            <button onClick={() => setCode(SAMPLE_MERMAID)}>샘플 넣기</button>
            <button className="btn-primary" onClick={renderCode} disabled={!code.trim()}>
              다이어그램 렌더링
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
