import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ClienteInfo } from '@/lib/types';

const COLLECTION = 'clientes';

export async function buscarCliente(clientId: string): Promise<ClienteInfo | null> {
  const docRef = doc(db, COLLECTION, clientId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as ClienteInfo;
}

export async function listarClientes(): Promise<ClienteInfo[]> {
  const q = query(collection(db, COLLECTION), orderBy('razaoSocial', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ClienteInfo);
}

export async function salvarCliente(
  clientId: string,
  data: Omit<ClienteInfo, 'id' | 'atualizadoEm'>
): Promise<void> {
  const docRef = doc(db, COLLECTION, clientId);
  await setDoc(
    docRef,
    {
      ...data,
      atualizadoEm: Timestamp.now(),
    },
    { merge: true }
  );
}

export async function atualizarCliente(
  clientId: string,
  data: Partial<ClienteInfo>
): Promise<void> {
  const docRef = doc(db, COLLECTION, clientId);
  await updateDoc(docRef, {
    ...data,
    atualizadoEm: Timestamp.now(),
  });
}
