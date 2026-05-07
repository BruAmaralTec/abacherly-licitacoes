import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = (v: string | undefined, fallback: string) => (v ?? fallback).trim();

const firebaseConfig = {
  apiKey: env(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "AIzaSyCaktggmquKLhi18qLRVdWxqZNylWQFfng"),
  authDomain: env(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, "abacherly-licitacoes.firebaseapp.com"),
  projectId: env(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "abacherly-licitacoes"),
  storageBucket: env(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, "abacherly-licitacoes.firebasestorage.app"),
  messagingSenderId: env(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, "1036949086437"),
  appId: env(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, "1:1036949086437:web:79d2c554503a7bb327f40c"),
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore client-side só é usado pelos services antigos (licitações, eventos etc).
// O AuthContext e os fluxos críticos (profile) usam API routes Next.js server-side.
// experimentalForceLongPolling para máxima compatibilidade caso o cliente use.
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch {
  dbInstance = getFirestore(app);
}

export const auth = getAuth(app);
export const db = dbInstance;
export const storage = getStorage(app);

export default app;
