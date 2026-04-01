/**
 * Serviço de integração com a API do Conlicitação
 *
 * API REST que retorna JSON.
 * Autenticação via token no header.
 * Requer IP fixo cadastrado.
 *
 * TODO: Configurar token quando liberado pelo Conlicitação
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_CONLICITACAO_API_URL || '';
const API_TOKEN = process.env.CONLICITACAO_API_TOKEN || '';

interface ConlicitacaoResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface DadosEdital {
  numero: string;
  objeto: string;
  orgao: string;
  modalidade: string;
  valorEstimado: number;
  dataCertame: string;
  horaCertame: string;
  prazoEntrega: string;
  localEntrega: string;
  urlEdital?: string;
  itens?: ItemEdital[];
}

export interface ItemEdital {
  item: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitarioEstimado: number;
  valorTotalEstimado: number;
}

async function fetchAPI<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  if (!API_BASE_URL || !API_TOKEN) {
    throw new Error(
      'API do Conlicitação não configurada. Configure NEXT_PUBLIC_CONLICITACAO_API_URL e CONLICITACAO_API_TOKEN.'
    );
  }

  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Erro na API Conlicitação: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Busca dados de um edital pelo número
 */
export async function buscarEdital(numero: string): Promise<DadosEdital> {
  return fetchAPI<DadosEdital>('/edital', { numero });
}

/**
 * Busca dados de um edital pela URL do Conlicitação
 */
export async function buscarEditalPorUrl(url: string): Promise<DadosEdital> {
  // Extrai o ID/código da URL do Conlicitação
  const match = url.match(/\/(\d+)\/?$/);
  const codigo = match ? match[1] : url;
  return fetchAPI<DadosEdital>('/edital', { codigo });
}

/**
 * Verifica se a API está configurada e acessível
 */
export function isConlicitacaoConfigurado(): boolean {
  return Boolean(API_BASE_URL && API_TOKEN);
}
