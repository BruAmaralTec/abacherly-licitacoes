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
import { Evento, TipoEvento } from '@/lib/types';

const COLLECTION = 'eventos';

export async function criarEvento(
  data: Omit<Evento, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const agora = Timestamp.now();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    criadoEm: agora,
    atualizadoEm: agora,
  });
  return docRef.id;
}

export async function buscarEvento(id: string): Promise<Evento | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Evento;
}

export async function listarEventos(clientId: string): Promise<Evento[]> {
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    orderBy('dataHora', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evento));
}

export async function listarEventosProximos(
  clientId: string,
  dias: number = 30
): Promise<Evento[]> {
  const agora = Timestamp.now();
  const limite = Timestamp.fromDate(
    new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
  );
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    where('dataHora', '>=', agora),
    where('dataHora', '<=', limite),
    orderBy('dataHora', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evento));
}

export async function listarEventosPorTipo(
  clientId: string,
  tipo: TipoEvento
): Promise<Evento[]> {
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    where('tipo', '==', tipo),
    orderBy('dataHora', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evento));
}

export async function marcarConcluido(
  id: string,
  concluido: boolean = true
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    concluido,
    atualizadoEm: Timestamp.now(),
  });
}

export async function excluirEvento(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
