import { useEffect, useState } from 'react'
import {
  deleteDiagram,
  listDiagrams,
  loadDiagram,
  type SavedDiagram,
  type SavedDiagramMeta,
} from '../lib/diagrams'

interface Props {
  uid: string
  currentDocId: string | null
  onLoad: (saved: SavedDiagram) => void
  onClose: () => void
}

function formatWhen(ms: number | null): string {
  if (!ms) return ''
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function MyDiagramsDialog({ uid, currentDocId, onLoad, onClose }: Props) {
  const [items, setItems] = useState<SavedDiagramMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = () => {
    setError(null)
    listDiagrams(uid)
      .then(setItems)
      .catch((e) => setError(e?.message ?? String(e)))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const handleLoad = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      const saved = await loadDiagram(uid, id)
      if (saved) onLoad(saved)
      else setError('이미 삭제된 다이어그램이에요.')
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 다이어그램을 삭제할까요?')) return
    setBusyId(id)
    setError(null)
    try {
      await deleteDiagram(uid, id)
      setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev))
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <h2>내 다이어그램</h2>
        <p className="modal__lead">클라우드에 저장한 다이어그램을 불러오거나 삭제할 수 있어요.</p>

        {error && <p className="saved-list__error">⚠️ {error}</p>}

        {items === null ? (
          <p className="saved-list__empty">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="saved-list__empty">아직 저장한 다이어그램이 없어요. 상단의 “저장” 버튼으로 저장해 보세요.</p>
        ) : (
          <ul className="saved-list">
            {items.map((it) => (
              <li key={it.id} className={it.id === currentDocId ? 'is-current' : ''}>
                <div className="saved-list__meta">
                  <strong>{it.name}</strong>
                  <span>
                    {formatWhen(it.updatedAt)}
                    {it.id === currentDocId ? ' · 현재 편집 중' : ''}
                  </span>
                </div>
                <div className="saved-list__actions">
                  <button onClick={() => handleLoad(it.id)} disabled={busyId === it.id}>
                    불러오기
                  </button>
                  <button
                    className="saved-list__delete"
                    onClick={() => handleDelete(it.id)}
                    disabled={busyId === it.id}
                    title="삭제"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="modal__actions">
          <button className="btn-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
