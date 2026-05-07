import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentMultipleTabManager,
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

// Firestore: força auto-detect de long-polling. WebSockets podem ser bloqueados
// por proxies corporativos / antivírus / extensões — long-polling sempre passa.
// experimentalAutoDetectLongPolling testa WebSocket primeiro e cai pra HTTP se falhar.
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: typeof window !== 'undefined'
      ? persistentLocalCache({
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
          tabManager: persistentMultipleTabManager(),
        })
      : undefined,
  });
} catch {
  // Se já foi inicializado em outro lugar (HMR), reusa
  dbInstance = getFirestore(app);
}

export const auth = getAuth(app);
export const db = dbInstance;
export const storage = getStorage(app);

export default app;
