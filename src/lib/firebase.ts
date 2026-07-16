import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore'

// Firebase web config comes from .env.local (VITE_FIREBASE_*). These are public
// project identifiers, not secrets — access is guarded by Firebase auth rules and
// the project's authorized domains, not by hiding these values.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

/** Auth is optional: without a configured Firebase project the button stays hidden. */
export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.appId)

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

const getApp = () => (app = app ?? initializeApp(config))

export function getFirebaseAuth(): Auth | null {
  if (!firebaseEnabled) return null
  if (!authInstance) authInstance = getAuth(getApp())
  return authInstance
}

export function getDb(): Firestore | null {
  if (!firebaseEnabled) return null
  // ignoreUndefinedProperties: diagram edges carry `label: undefined` when no
  // label is set; without this Firestore rejects the whole write.
  if (!dbInstance) dbInstance = initializeFirestore(getApp(), { ignoreUndefinedProperties: true })
  return dbInstance
}

export const googleProvider = new GoogleAuthProvider()
