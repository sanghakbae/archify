import { useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { firebaseEnabled, getFirebaseAuth, googleProvider } from './firebase'

export interface AuthState {
  /** Whether Firebase is configured; when false the sign-in UI is hidden. */
  enabled: boolean
  /** null while the initial auth state is still loading. */
  ready: boolean
  user: User | null
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!firebaseEnabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) return
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setReady(true)
    })
    return unsub
  }, [])

  const signIn = async () => {
    const auth = getFirebaseAuth()
    if (!auth) return
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e: any) {
      // Ignore the benign "user closed the popup" case.
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return
      setError(e?.message ?? String(e))
    }
  }

  const signOut = async () => {
    const auth = getFirebaseAuth()
    if (!auth) return
    await fbSignOut(auth)
  }

  return { enabled: firebaseEnabled, ready, user, error, signIn, signOut }
}
