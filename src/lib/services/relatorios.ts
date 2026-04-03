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
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RelatorioLicitacao } from '@/lib/types';

const COLLECTION = 'relatorios';

export async function criarRelatorio(
  data: Omit<RelatorioLicitacao, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    criadoEm: Timestamp.now(),
    atualizadoEm: Timestamp.now(),
  });
  return docRef.id;
}

export async function buscarRelatorio(id: string): Promise<RelatorioLicitacao | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as RelatorioLicitacao;
}

export async function listarRelatoriosPorCliente(
  clientId: string,
  apenasLiberados = false
): Promise<RelatorioLicitacao[]> {
  let q;
  if (apenasLiberados) {
    q = query(
      collection(db, COLLECTION),
      where('clientId', '==', clientId),
      where('liberadoParaCliente', '==', true),
      orderBy('criadoEm', 'desc')
    );
  } else {
    q = query(
      collection(db, COLLECTION),
      where('clientId', '==', clientId),
      orderBy('criadoEm', 'desc')
    );
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as RelatorioLicitacao);
}

export async function listarTodosRelatorios(clientId?: string): Promise<RelatorioLicitacao[]> {
  let q;
  if (clientId) {
    q = query(
      collection(db, COLLECTION),
      where('clientId', '==', clientId),
      orderBy('criadoEm', 'desc')
    );
  } else {
    q = query(collection(db, COLLECTION), orderBy('criadoEm', 'desc'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as RelatorioLicitacao);
}

export async function atualizarRelatorio(
  id: string,
  data: Partial<RelatorioLicitacao>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    atualizadoEm: Timestamp.now(),
  });
}

export async function liberarRelatorio(id: string): Promise<void> {
  await atualizarRelatorio(id, { liberadoParaCliente: true });
}

export async function liberarRelatoriosEmLote(ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach((id) => {
    const docRef = doc(db, COLLECTION, id);
    batch.update(docRef, {
      liberadoParaCliente: true,
      atualizadoEm: Timestamp.now(),
    });
  });
  await batch.commit();
}
