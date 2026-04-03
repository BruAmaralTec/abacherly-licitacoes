import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { db } from '@/lib/firebase';

const COLLECTION = 'users';

export interface UserFirestore {
  id?: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'operator' | 'cliente';
  clientId?: string;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
}

export async function listarUsuarios(): Promise<UserFirestore[]> {
  const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as UserFirestore);
}

export async function buscarUsuario(id: string): Promise<UserFirestore | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as UserFirestore;
}

export async function criarUsuario(
  email: string,
  password: string,
  name: string,
  role: UserFirestore['role'],
  clientId?: string
): Promise<string> {
  // Criar uma instância secundária do Firebase para não deslogar o admin atual
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCaktggmquKLhi18qLRVdWxqZNylWQFfng",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "abacherly-licitacoes.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "abacherly-licitacoes",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "abacherly-licitacoes.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1036949086437",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1036949086437:web:79d2c554503a7bb327f40c",
  };

  const secondaryApp = initializeApp(firebaseConfig, 'secondary-auth');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCredential.user.uid;

    // Criar documento no Firestore
    await setDoc(doc(db, COLLECTION, uid), {
      email,
      name,
      role,
      clientId: clientId || '',
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
    });

    // Deslogar da instância secundária
    await secondaryAuth.signOut();

    return uid;
  } catch (error: any) {
    // Limpar instância secundária em caso de erro
    try { await secondaryAuth.signOut(); } catch {}

    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Este e-mail já está em uso');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('A senha deve ter pelo menos 6 caracteres');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('E-mail inválido');
    }
    throw error;
  }
}

export async function atualizarUsuario(
  id: string,
  data: Partial<Pick<UserFirestore, 'name' | 'role' | 'clientId'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, data);
}

export async function excluirUsuario(id: string): Promise<void> {
  // Remove apenas do Firestore (Firebase Auth exigiria Admin SDK)
  await deleteDoc(doc(db, COLLECTION, id));
}
