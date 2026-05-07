import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCaktggmquKLhi18qLRVdWxqZNylWQFfng",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "abacherly-licitacoes.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "abacherly-licitacoes",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "abacherly-licitacoes.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1036949086437",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1036949086437:web:79d2c554503a7bb327f40c",
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore: força HTTP long-polling sempre (em vez de WebSockets).
// Resolve "client is offline" em redes com proxy/antivirus/extensoes que
// bloqueiam WebSocket. HTTP passa em 100% das redes que abrem o restante do site.
// Sem persistencia local — evita problemas com IndexedDB restrito.
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch {
  dbInstance = getFirestore(app);
}

export const auth = getAuth(app);
export const db = dbInstance;
export const storage = getStorage(app);

export default app;
