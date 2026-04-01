import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Licitacao, LicitacaoStatus } from '@/lib/types';

const COLLECTION = 'licitacoes';

export async function criarLicitacao(
  data: Omit<Licitacao, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const agora = Timestamp.now();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    criadoEm: agora,
    atualizadoEm: agora,
  });
  return docRef.id;
}

export async function buscarLicitacao(id: string): Promise<Licitacao | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Licitacao;
}

export async function listarLicitacoes(clientId: string): Promise<Licitacao[]> {
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    orderBy('criadoEm', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Licitacao));
}

export async function listarLicitacoesPorStatus(
  clientId: string,
  status: LicitacaoStatus
): Promise<Licitacao[]> {
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    where('status', '==', status),
    orderBy('criadoEm', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Licitacao));
}

export async function atualizarLicitacao(
  id: string,
  data: Partial<Licitacao>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    atualizadoEm: Timestamp.now(),
  });
}

export async function atualizarStatus(
  id: string,
  status: LicitacaoStatus
): Promise<void> {
  await atualizarLicitacao(id, { status });
}

export async function excluirLicitacao(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
