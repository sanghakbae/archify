import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { ChatMessage, Diagram } from '../types'
import type { DiagramLook } from '../components/DiagramView'

/** The full snapshot we persist per saved diagram. */
export interface DiagramSnapshot {
  diagram: Diagram
  messages: ChatMessage[]
  look: DiagramLook
  rawCode: string | null
}

/** A row in the "내 다이어그램" list. */
export interface SavedDiagramMeta {
  id: string
  name: string
  updatedAt: number | null
}

export interface SavedDiagram extends DiagramSnapshot {
  id: string
  name: string
}

const colRef = (uid: string) => {
  const db = getDb()
  if (!db) throw new Error('Firebase가 설정되지 않았어요.')
  return collection(db, 'users', uid, 'diagrams')
}

const toMillis = (ts: unknown): number | null =>
  ts && typeof (ts as Timestamp).toMillis === 'function' ? (ts as Timestamp).toMillis() : null

/**
 * Save a snapshot. With an id, overwrites that document; otherwise creates a new
 * one. Returns the document id (new or existing).
 */
export async function saveDiagram(
  uid: string,
  name: string,
  snapshot: DiagramSnapshot,
  id?: string,
): Promise<string> {
  const base = {
    name,
    diagram: snapshot.diagram,
    messages: snapshot.messages,
    look: snapshot.look,
    rawCode: snapshot.rawCode ?? null,
    updatedAt: serverTimestamp(),
  }
  if (id) {
    await setDoc(doc(colRef(uid), id), base, { merge: true })
    return id
  }
  const created = await addDoc(colRef(uid), { ...base, createdAt: serverTimestamp() })
  return created.id
}

export async function listDiagrams(uid: string): Promise<SavedDiagramMeta[]> {
  // No orderBy: Firestore's orderBy silently drops documents missing the sorted
  // field, which would hide older docs saved without an updatedAt. Fetch all and
  // sort client-side (updatedAt, then createdAt, unknowns last).
  const snap = await getDocs(colRef(uid))
  const rows = snap.docs.map((d) => {
    const data = d.data()
    const when = toMillis(data.updatedAt) ?? toMillis(data.createdAt)
    return { id: d.id, name: String(data.name ?? '제목 없는 아키텍처'), updatedAt: when }
  })
  return rows.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
}

export async function loadDiagram(uid: string, id: string): Promise<SavedDiagram | null> {
  const snap = await getDoc(doc(colRef(uid), id))
  if (!snap.exists()) return null
  const data = snap.data()
  const name = String(data.name ?? '제목 없는 아키텍처')
  // Coerce to a valid diagram shape so a malformed/legacy doc can't crash the canvas.
  const raw = (data.diagram ?? {}) as Partial<Diagram>
  const diagram: Diagram = {
    title: String(raw.title ?? name),
    direction: raw.direction === 'LR' ? 'LR' : 'TB',
    nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
    edges: Array.isArray(raw.edges) ? raw.edges : [],
  }
  return {
    id: snap.id,
    name,
    diagram,
    messages: Array.isArray(data.messages) ? data.messages : [],
    look: data.look === 'sketch' ? 'sketch' : 'clean',
    rawCode: typeof data.rawCode === 'string' ? data.rawCode : null,
  }
}

export async function deleteDiagram(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(colRef(uid), id))
}
