import { useEffect, useState } from 'react'
import ChatPanel from './components/ChatPanel'
import DiagramView, { type DiagramLook } from './components/DiagramView'
import SettingsDialog, { type Settings } from './components/SettingsDialog'
import AuthButton from './components/AuthButton'
import MyDiagramsDialog from './components/MyDiagramsDialog'
import { useAuth } from './lib/useAuth'
import { saveDiagram, type SavedDiagram } from './lib/diagrams'
import { parseMessage } from './lib/parser'
import { generateWithLlm, type Provider } from './lib/llm'
import { toMermaid } from './lib/diagram'
import { emptyDiagram, type ChatMessage, type Diagram } from './types'

const STORAGE_KEY = 'archify.state.v1'
const SETTINGS_KEY = 'archify.settings.v1'

// Configuration coming from .env / .env.local (Vite exposes VITE_* to the browser).
const ENV = {
  provider: ((import.meta.env.VITE_LLM_PROVIDER as Provider) || 'openai') as Provider,
  openaiKey: (import.meta.env.VITE_OPENAI_API_KEY ?? '').trim(),
  openaiModel: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
  anthropicKey: (import.meta.env.VITE_ANTHROPIC_API_KEY ?? '').trim(),
  anthropicModel: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-5',
}
const ENV_KEYS = { openai: ENV.openaiKey.length > 0, anthropic: ENV.anthropicKey.length > 0 }

const envKeyFor = (p: Provider) => (p === 'openai' ? ENV.openaiKey : ENV.anthropicKey)
const envModelFor = (p: Provider) => (p === 'openai' ? ENV.openaiModel : ENV.anthropicModel)

/** Merge stored settings with env-derived defaults (and migrate the old shape). */
function resolveSettings(stored: Partial<Settings> | null): Settings {
  const provider = stored?.provider ?? ENV.provider
  return {
    useLlm: stored?.useLlm ?? (ENV_KEYS.openai || ENV_KEYS.anthropic),
    provider,
    apiKey: stored?.apiKey ?? '',
    model: stored?.model || envModelFor(provider),
  }
}

interface PersistedState {
  diagram: Diagram
  messages: ChatMessage[]
  look?: DiagramLook
  rawCode?: string | null
  currentDocId?: string | null
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text:
    '안녕하세요! 저는 **Archify**예요. 시스템을 자연어로 설명해 주시면 아키텍처를 그려 드릴게요.\n' +
    '예를 들어 “React 프론트엔드가 Node API와 통신하고 Postgres 데이터베이스를 쓰는 구조”처럼 말해 보세요. ' +
    '`X를 Y에 연결`, `캐시 삭제`, `레이아웃 좌우로`, `초기화` 같은 명령도 쓸 수 있어요.\n' +
    '위의 **Mermaid 코드** 모드로 전환하면 직접 작성한 다이어그램을 붙여넣을 수도 있어요.',
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
    if (raw) return resolveSettings(JSON.parse(raw))
  } catch { /* ignore */ }
  return resolveSettings(null)
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
  const auth = useAuth()
  const [showDiagrams, setShowDiagrams] = useState(false)
  const [currentDocId, setCurrentDocId] = useState<string | null>(initial.currentDocId ?? null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diagram, messages, look, rawCode, currentDocId }))
  }, [diagram, messages, look, rawCode, currentDocId])

  const addMessage = (role: ChatMessage['role'], text: string) =>
    setMessages((prev) => [...prev, { id: newId(), role, text, ts: Date.now() }])

  // Effective API key: the Settings field wins, otherwise fall back to .env.
  const effectiveKey = settings.apiKey.trim() || envKeyFor(settings.provider)
  const aiActive = settings.useLlm && effectiveKey.length > 0

  const handleSend = async (text: string) => {
    setRawCode(null) // returning to model-driven view
    addMessage('user', text)
    setBusy(true)

    try {
      if (aiActive) {
        const result = await generateWithLlm(text, diagram, {
          provider: settings.provider,
          apiKey: effectiveKey,
          model: settings.model || envModelFor(settings.provider),
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
        `⚠️ ${settings.useLlm ? `${settings.provider === 'openai' ? 'OpenAI' : 'Claude'} 요청 실패` : '문제가 발생했어요'}: ${
          err?.message ?? err
        }\n\n이 메시지는 내장 파서로 대신 처리할게요.`,
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
    if (!confirm('다이어그램과 채팅 기록을 모두 지울까요?')) return
    setDiagram(emptyDiagram())
    setMessages([WELCOME])
    setRawCode(null)
    setCurrentDocId(null)
  }

  const handleSave = async () => {
    if (!auth.user || saveState === 'saving') return
    setSaveState('saving')
    try {
      const name = (rawCode !== null ? '붙여넣은 Mermaid' : diagram.title) || '제목 없는 아키텍처'
      const id = await saveDiagram(
        auth.user.uid,
        name,
        { diagram, messages, look, rawCode },
        currentDocId ?? undefined,
      )
      setCurrentDocId(id)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1600)
    } catch (err) {
      console.error('Failed to save diagram', err)
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 2400)
    }
  }

  const handleLoadSaved = (saved: SavedDiagram) => {
    setDiagram(saved.diagram)
    setMessages(saved.messages.length > 0 ? saved.messages : [WELCOME])
    setLook(saved.look)
    setRawCode(saved.rawCode)
    setCurrentDocId(saved.id)
    setShowDiagrams(false)
  }

  // What the canvas renders: pasted Mermaid code takes precedence over the model.
  const isRaw = rawCode !== null
  const code = isRaw ? (rawCode as string) : toMermaid(diagram)
  const title = isRaw ? '붙여넣은 Mermaid' : diagram.title
  const nodeCount = isRaw ? 0 : diagram.nodes.length
  const edgeCount = isRaw ? 0 : diagram.edges.length
  const providerLabel = settings.provider === 'openai' ? 'OpenAI' : 'Claude'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__logo">🧩</span>
          <div>
            <h1>Archify</h1>
            <p>대화로 완성하는 아키텍처 다이어그램</p>
          </div>
        </div>
        <div className="topbar__actions">
          <span className={`mode ${aiActive ? 'mode--ai' : 'mode--local'}`}>
            {aiActive ? `✨ ${providerLabel} AI` : '⚡ 로컬 파서'}
          </span>
          {auth.user && (
            <>
              <button onClick={handleSave} disabled={saveState === 'saving'}>
                {saveState === 'saving'
                  ? '저장 중…'
                  : saveState === 'saved'
                    ? '저장됨 ✓'
                    : saveState === 'error'
                      ? '저장 실패'
                      : '💾 저장'}
              </button>
              <button onClick={() => setShowDiagrams(true)}>📂 내 다이어그램</button>
            </>
          )}
          <button onClick={() => setShowSettings(true)}>설정</button>
          <button onClick={resetAll}>초기화</button>
          <AuthButton auth={auth} />
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

      {showDiagrams && auth.user && (
        <MyDiagramsDialog
          uid={auth.user.uid}
          currentDocId={currentDocId}
          onLoad={handleLoadSaved}
          onClose={() => setShowDiagrams(false)}
        />
      )}

      {showSettings && (
        <SettingsDialog
          settings={settings}
          envKeys={ENV_KEYS}
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
