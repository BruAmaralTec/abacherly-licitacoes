import { Evento, TipoEvento } from '@/lib/types';
import { api } from '@/lib/apiClient';

export async function criarEvento(
  data: Omit<Evento, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const r = await api.post<{ id: string }>('/api/eventos', data);
  return r.id;
}

export async function buscarEvento(id: string): Promise<Evento | null> {
  return api.get<Evento | null>(`/api/eventos/${id}`);
}

export async function listarEventos(clientId: string): Promise<Evento[]> {
  return api.get<Evento[]>(`/api/eventos?clientId=${encodeURIComponent(clientId)}`);
}

export async function listarEventosProximos(
  clientId: string,
  dias: number = 30
): Promise<Evento[]> {
  return api.get<Evento[]>(
    `/api/eventos?clientId=${encodeURIComponent(clientId)}&proximosDias=${dias}`
  );
}

export async function listarEventosPorTipo(
  clientId: string,
  tipo: TipoEvento
): Promise<Evento[]> {
  // filtragem por tipo no client (mais simples que adicionar query no server agora)
  const todos = await listarEventos(clientId);
  return todos.filter((e) => e.tipo === tipo);
}

export async function marcarConcluido(id: string, concluido: boolean = true): Promise<void> {
  await api.patch(`/api/eventos/${id}`, { concluido });
}

export async function excluirEvento(id: string): Promise<void> {
  await api.delete(`/api/eventos/${id}`);
}
