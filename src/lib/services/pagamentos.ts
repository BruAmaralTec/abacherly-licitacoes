import { Timestamp } from 'firebase/firestore';
import { Pagamento, PagamentoStatus } from '@/lib/types';
import { api } from '@/lib/apiClient';

export async function criarPagamento(
  data: Omit<Pagamento, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const r = await api.post<{ id: string }>('/api/pagamentos', data);
  return r.id;
}

export async function listarPagamentos(clientId: string): Promise<Pagamento[]> {
  return api.get<Pagamento[]>(`/api/pagamentos?clientId=${encodeURIComponent(clientId)}`);
}

export async function listarPagamentosPorStatus(
  clientId: string,
  status: PagamentoStatus
): Promise<Pagamento[]> {
  const todos = await listarPagamentos(clientId);
  return todos.filter((p) => p.status === status);
}

export async function confirmarRecebimento(id: string, dataPagamento: Date): Promise<void> {
  await api.patch(`/api/pagamentos/${id}`, {
    status: 'recebido',
    dataPagamento: Timestamp.fromDate(dataPagamento),
    diasAtraso: 0,
  });
}

export async function recalcularAtrasos(clientId: string): Promise<void> {
  const pagamentos = await listarPagamentosPorStatus(clientId, 'aguardando');
  for (const pag of pagamentos) {
    const dataEntrega = pag.dataEntrega.toDate();
    const diasDesdeEntrega = Math.ceil(
      (Date.now() - dataEntrega.getTime()) / (1000 * 60 * 60 * 24)
    );
    const diasAtraso = Math.max(0, diasDesdeEntrega - 30);
    if (diasAtraso !== pag.diasAtraso) {
      await api.patch(`/api/pagamentos/${pag.id}`, { diasAtraso });
    }
  }
}

export async function excluirPagamento(id: string): Promise<void> {
  await api.delete(`/api/pagamentos/${id}`);
}
