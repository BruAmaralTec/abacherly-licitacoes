import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Pagamento, PagamentoStatus } from '@/lib/types';

const COLLECTION = 'pagamentos';

export async function criarPagamento(
  data: Omit<Pagamento, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const agora = Timestamp.now();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    criadoEm: agora,
    atualizadoEm: agora,
  });
  return docRef.id;
}

export async function listarPagamentos(clientId: string): Promise<Pagamento[]> {
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    orderBy('criadoEm', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pagamento));
}

export async function listarPagamentosPorStatus(
  clientId: string,
  status: PagamentoStatus
): Promise<Pagamento[]> {
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    where('status', '==', status),
    orderBy('criadoEm', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pagamento));
}

export async function confirmarRecebimento(
  id: string,
  dataPagamento: Date
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'recebido' as PagamentoStatus,
    dataPagamento: Timestamp.fromDate(dataPagamento),
    diasAtraso: 0,
    atualizadoEm: Timestamp.now(),
  });
}

/**
 * Recalcula dias de atraso de todos os pagamentos pendentes
 */
export async function recalcularAtrasos(clientId: string): Promise<void> {
  const pagamentos = await listarPagamentosPorStatus(clientId, 'aguardando');

  for (const pag of pagamentos) {
    const dataEntrega = pag.dataEntrega.toDate();
    const diasDesdeEntrega = Math.ceil(
      (Date.now() - dataEntrega.getTime()) / (1000 * 60 * 60 * 24)
    );
    const diasAtraso = Math.max(0, diasDesdeEntrega - 30); // 30 dias é o prazo normal

    if (diasAtraso !== pag.diasAtraso) {
      await updateDoc(doc(db, COLLECTION, pag.id!), {
        diasAtraso,
        atualizadoEm: Timestamp.now(),
      });
    }
  }
}

export async function excluirPagamento(id: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, COLLECTION, id));
}
