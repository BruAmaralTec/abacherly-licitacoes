import { Licitacao, LicitacaoStatus } from '@/lib/types';
import { api } from '@/lib/apiClient';

export async function criarLicitacao(
  data: Omit<Licitacao, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const r = await api.post<{ id: string }>('/api/licitacoes', data);
  return r.id;
}

export async function buscarLicitacao(id: string): Promise<Licitacao | null> {
  return api.get<Licitacao | null>(`/api/licitacoes/${id}`);
}

export async function listarLicitacoes(clientId: string): Promise<Licitacao[]> {
  return api.get<Licitacao[]>(`/api/licitacoes?clientId=${encodeURIComponent(clientId)}`);
}

export async function listarTodasLicitacoes(): Promise<Licitacao[]> {
  return api.get<Licitacao[]>('/api/licitacoes?all=true');
}

export async function listarLicitacoesPorStatus(
  clientId: string,
  status: LicitacaoStatus
): Promise<Licitacao[]> {
  return api.get<Licitacao[]>(`/api/licitacoes?clientId=${encodeURIComponent(clientId)}&status=${status}`);
}

export async function atualizarLicitacao(
  id: string,
  data: Partial<Licitacao>
): Promise<void> {
  await api.patch(`/api/licitacoes/${id}`, data);
}

export async function atualizarStatus(id: string, status: LicitacaoStatus): Promise<void> {
  await atualizarLicitacao(id, { status });
}

export async function excluirLicitacao(id: string): Promise<void> {
  await api.delete(`/api/licitacoes/${id}`);
}
