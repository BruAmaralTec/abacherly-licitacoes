import { RelatorioLicitacao } from '@/lib/types';
import { api } from '@/lib/apiClient';

export async function criarRelatorio(
  data: Omit<RelatorioLicitacao, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const r = await api.post<{ id: string }>('/api/relatorios', data);
  return r.id;
}

export async function buscarRelatorio(id: string): Promise<RelatorioLicitacao | null> {
  return api.get<RelatorioLicitacao | null>(`/api/relatorios/${id}`);
}

export async function listarRelatoriosPorCliente(
  clientId: string,
  apenasLiberados = false
): Promise<RelatorioLicitacao[]> {
  const lista = await api.get<RelatorioLicitacao[]>(
    `/api/relatorios?clientId=${encodeURIComponent(clientId)}`
  );
  return apenasLiberados ? lista.filter((r) => r.liberadoParaCliente) : lista;
}

export async function listarTodosRelatorios(clientId?: string): Promise<RelatorioLicitacao[]> {
  const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
  return api.get<RelatorioLicitacao[]>(`/api/relatorios${qs}`);
}

export async function atualizarRelatorio(
  id: string,
  data: Partial<RelatorioLicitacao>
): Promise<void> {
  await api.patch(`/api/relatorios/${id}`, data);
}

export async function liberarRelatorio(id: string): Promise<void> {
  await atualizarRelatorio(id, { liberadoParaCliente: true });
}

export async function liberarRelatoriosEmLote(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => atualizarRelatorio(id, { liberadoParaCliente: true })));
}
