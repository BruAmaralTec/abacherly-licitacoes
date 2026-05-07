import { ClienteInfo } from '@/lib/types';
import { api } from '@/lib/apiClient';

export async function buscarCliente(clientId: string): Promise<ClienteInfo | null> {
  return api.get<ClienteInfo | null>(`/api/clientes/${encodeURIComponent(clientId)}`);
}

export async function listarClientes(): Promise<ClienteInfo[]> {
  return api.get<ClienteInfo[]>('/api/clientes');
}

export async function salvarCliente(
  clientId: string,
  data: Omit<ClienteInfo, 'id' | 'atualizadoEm'>
): Promise<void> {
  // POST cria/atualiza (set merge); PATCH atualiza campo a campo.
  await api.post('/api/clientes', { id: clientId, ...data });
}

export async function atualizarCliente(
  clientId: string,
  data: Partial<Omit<ClienteInfo, 'id'>>
): Promise<void> {
  await api.patch(`/api/clientes/${encodeURIComponent(clientId)}`, data);
}

export async function excluirCliente(clientId: string): Promise<void> {
  await api.delete(`/api/clientes/${encodeURIComponent(clientId)}`);
}

export interface ExtracaoCartaoCNPJ {
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  porteEmpresa?: string;
  telefone?: string;
  emailContato?: string;
  endereco?: string;
}

export async function extrairCartaoCNPJ(arquivo: File): Promise<ExtracaoCartaoCNPJ> {
  const form = new FormData();
  form.append('arquivo', arquivo, arquivo.name);
  const r = await api.upload<{ extracao: ExtracaoCartaoCNPJ }>(
    '/api/clientes/extrair-cnpj',
    form
  );
  return r.extracao || {};
}
