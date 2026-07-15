import { useState } from 'react'

export interface Settings {
  useLlm: boolean
  apiKey: string
  model: string
}

interface Props {
  settings: Settings
  onSave: (s: Settings) => void
  onClose: () => void
}

const MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (most capable)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest)' },
]

export default function SettingsDialog({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>(settings)

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <p className="modal__lead">
          Archify works fully offline with a built-in parser. Optionally connect the Claude API for
          smarter, free-form generation.
        </p>

        <label className="toggle">
          <input
            type="checkbox"
            checked={draft.useLlm}
            onChange={(e) => setDraft({ ...draft, useLlm: e.target.checked })}
          />
          <span>Use Claude API for generation</span>
        </label>

        <fieldset disabled={!draft.useLlm} className="modal__fieldset">
          <label className="field">
            <span>Anthropic API key</span>
            <input
              type="password"
              placeholder="sk-ant-…"
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Model</span>
            <select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <p className="modal__note">
            🔒 Your key is stored only in this browser's local storage and sent directly to Anthropic.
            Requests use <code>anthropic-dangerous-direct-browser-access</code>.
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
