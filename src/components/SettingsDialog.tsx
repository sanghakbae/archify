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
    { id: 'gpt-4o-mini', label: 'GPT-4o mini (fast, cheap)' },
    { id: 'gpt-4o', label: 'GPT-4o (most capable)' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  ],
  anthropic: [
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
    { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (most capable)' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest)' },
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
        <h2>Settings</h2>
        <p className="modal__lead">
          Archify works fully offline with a built-in parser. Optionally connect an LLM for smarter,
          free-form generation.
        </p>

        <label className="toggle">
          <input
            type="checkbox"
            checked={draft.useLlm}
            onChange={(e) => setDraft({ ...draft, useLlm: e.target.checked })}
          />
          <span>Use an AI model for generation</span>
        </label>

        <fieldset disabled={!draft.useLlm} className="modal__fieldset">
          <label className="field">
            <span>Provider</span>
            <select value={draft.provider} onChange={(e) => setProvider(e.target.value as Provider)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </label>

          <label className="field">
            <span>
              API key{' '}
              {envKeyPresent && <em className="field__hint">— found in .env, leave blank to use it</em>}
            </span>
            <input
              type="password"
              placeholder={envKeyPresent ? 'Using key from .env.local' : draft.provider === 'openai' ? 'sk-…' : 'sk-ant-…'}
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Model</span>
            <select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
              {MODELS[draft.provider].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <p className="modal__note">
            🔒 Keys are read from <code>.env.local</code> (git-ignored) or this field, stored only in
            your browser, and sent directly to the provider. This is a client-side app — use a
            personal/dev key, not a production secret.
          </p>
        </fieldset>

        <div className="modal__actions">
          <button onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(draft)}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
