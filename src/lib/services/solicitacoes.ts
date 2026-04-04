import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Solicitacao, SolicitacaoStatus } from '@/lib/types';

const COLLECTION = 'solicitacoes';

export async function criarSolicitacao(
  data: Omit<Solicitacao, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    criadoEm: Timestamp.now(),
    atualizadoEm: Timestamp.now(),
  });
  return docRef.id;
}

export async function buscarSolicitacao(id: string): Promise<Solicitacao | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Solicitacao;
}

export async function listarSolicitacoesPorCliente(clientId: string): Promise<Solicitacao[]> {
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    orderBy('criadoEm', 'desc'),
    limit(100)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Solicitacao);
}

export async function listarTodasSolicitacoes(status?: SolicitacaoStatus): Promise<Solicitacao[]> {
  let q;
  if (status) {
    q = query(
      collection(db, COLLECTION),
      where('status', '==', status),
      orderBy('criadoEm', 'desc'),
      limit(200)
    );
  } else {
    q = query(collection(db, COLLECTION), orderBy('criadoEm', 'desc'), limit(200));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Solicitacao);
}

export async function atualizarSolicitacao(
  id: string,
  data: Partial<Solicitacao>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    atualizadoEm: Timestamp.now(),
  });
}

export async function processarSolicitacao(
  id: string,
  adminUid: string,
  licitacaoId: string
): Promise<void> {
  await atualizarSolicitacao(id, {
    status: 'concluida',
    processadoPor: adminUid,
    licitacaoId,
  });
}

export async function recusarSolicitacao(
  id: string,
  adminUid: string,
  motivo: string
): Promise<void> {
  await atualizarSolicitacao(id, {
    status: 'recusada',
    processadoPor: adminUid,
    observacoesAdmin: motivo,
  });
}
