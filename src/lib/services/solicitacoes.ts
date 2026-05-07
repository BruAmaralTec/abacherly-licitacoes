import { Solicitacao, SolicitacaoStatus } from '@/lib/types';
import { api } from '@/lib/apiClient';

export async function criarSolicitacao(
  data: Omit<Solicitacao, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const r = await api.post<{ id: string }>('/api/solicitacoes', data);
  return r.id;
}

export async function buscarSolicitacao(id: string): Promise<Solicitacao | null> {
  return api.get<Solicitacao | null>(`/api/solicitacoes/${id}`);
}

export async function listarSolicitacoesPorCliente(clientId: string): Promise<Solicitacao[]> {
  return api.get<Solicitacao[]>(`/api/solicitacoes?clientId=${encodeURIComponent(clientId)}`);
}

export async function listarTodasSolicitacoes(status?: SolicitacaoStatus): Promise<Solicitacao[]> {
  const qs = status ? `?status=${status}` : '';
  return api.get<Solicitacao[]>(`/api/solicitacoes${qs}`);
}

export async function atualizarSolicitacao(id: string, data: Partial<Solicitacao>): Promise<void> {
  await api.patch(`/api/solicitacoes/${id}`, data);
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
