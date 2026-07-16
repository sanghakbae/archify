import { useEffect, useRef, useState } from 'react'
import type { AuthState } from '../lib/useAuth'

/** Header sign-in control: a "Sign in with Google" button, or the user's avatar + menu. */
export default function AuthButton({ auth }: { auth: AuthState }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!auth.enabled) return null

  // Reserve space until the initial auth state resolves, to avoid a flash.
  if (!auth.ready) return <span className="auth auth--loading" aria-hidden />

  if (!auth.user) {
    return (
      <button className="auth-signin" onClick={auth.signIn} title="Google 계정으로 로그인">
        <GoogleMark />
        Google로 로그인
      </button>
    )
  }

  const { displayName, email, photoURL } = auth.user
  const name = displayName || email || '사용자'
  const initial = name.trim().charAt(0).toUpperCase()

  return (
    <div className="auth" ref={ref}>
      <button
        className="auth-avatar"
        onClick={() => setOpen((v) => !v)}
        title={name}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {photoURL ? (
          <img src={photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="auth-avatar__fallback">{initial}</span>
        )}
      </button>
      {open && (
        <div className="auth-menu" role="menu">
          <div className="auth-menu__id">
            <strong>{name}</strong>
            {email && displayName && <span>{email}</span>}
          </div>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false)
              auth.signOut()
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}
