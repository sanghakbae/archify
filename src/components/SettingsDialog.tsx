import { useState } from 'react'
import type { Provider } from '../lib/llm'

export interface Settings {
  useLlm: boolean
  provider: Provider
  apiKey: string
  model: string
}

interface Props {
  settings: Settings
  /** Whether a key is available from the environment (.env.local) for each provider. */
  envKeys: { openai: boolean; anthropic: boolean }
  onSave: (s: Settings) => void
  onClose: () => void
}

const MODELS: Record<Provider, Array<{ id: string; label: string }>> = {
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini (빠르고 저렴)' },
    { id: 'gpt-4o', label: 'GPT-4o (가장 강력)' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  ],
  anthropic: [
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (추천)' },
    { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (가장 강력)' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (가장 빠름)' },
  ],
}

const DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-5',
}

export default function SettingsDialog({ settings, envKeys, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>(settings)
  const envKeyPresent = envKeys[draft.provider]

  const setProvider = (provider: Provider) =>
    setDraft((d) => ({
      ...d,
      provider,
      // Snap the model to a sensible default for the new provider.
      model: MODELS[provider].some((m) => m.id === d.model) ? d.model : DEFAULT_MODEL[provider],
    }))

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <h2>설정</h2>
        <p className="modal__lead">
          Archify는 내장 파서로 완전히 오프라인에서도 동작합니다. 더 똑똑하고 자유로운 생성을 원하면
          LLM을 선택적으로 연결하세요.
        </p>

        <label className="toggle">
          <input
            type="checkbox"
            checked={draft.useLlm}
            onChange={(e) => setDraft({ ...draft, useLlm: e.target.checked })}
          />
          <span>생성에 AI 모델 사용</span>
        </label>

        <fieldset disabled={!draft.useLlm} className="modal__fieldset">
          <label className="field">
            <span>제공자</span>
            <select value={draft.provider} onChange={(e) => setProvider(e.target.value as Provider)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </label>

          <label className="field">
            <span>
              API 키{' '}
              {envKeyPresent && <em className="field__hint">— .env에서 찾음, 비워 두면 그 키를 사용</em>}
            </span>
            <input
              type="password"
              placeholder={envKeyPresent ? '.env.local의 키 사용 중' : draft.provider === 'openai' ? 'sk-…' : 'sk-ant-…'}
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>모델</span>
            <select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
              {MODELS[draft.provider].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <p className="modal__note">
            🔒 키는 <code>.env.local</code>(git 추적 제외) 또는 이 입력란에서 읽어오며, 브라우저에만
            저장되고 제공자에게 직접 전송됩니다. 이 앱은 클라이언트 사이드로 동작하니, 운영용 비밀 키가
            아닌 개인/개발용 키를 사용하세요.
          </p>
        </fieldset>

        <div className="modal__actions">
          <button onClick={onClose}>취소</button>
          <button className="btn-primary" onClick={() => onSave(draft)}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
