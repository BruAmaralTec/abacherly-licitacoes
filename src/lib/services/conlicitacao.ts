/**
 * Serviço de integração com APIs de licitações
 *
 * Fontes de dados (por prioridade):
 * 1. API Conlicitação (quando token disponível) — API REST privada
 * 2. API PNCP (pncp.gov.br) — API REST pública do Governo Federal
 */

// ==================== CONLICITAÇÃO (privada) ====================

const CONLICITACAO_API_URL = process.env.NEXT_PUBLIC_CONLICITACAO_API_URL || '';
const CONLICITACAO_TOKEN = process.env.CONLICITACAO_API_TOKEN || '';

// ==================== PNCP (pública - gov.br) ====================

const PNCP_API_URL = 'https://pncp.gov.br/api/consulta/v1';

// ==================== TIPOS ====================

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
  linkSistemaOrigem?: string;
  numeroControlePNCP?: string;
  codigoUnidade?: string;
  itens?: ItemEdital[];
  fonte: 'conlicitacao' | 'pncp';
}

export interface ItemEdital {
  item: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitarioEstimado: number;
  valorTotalEstimado: number;
}

export interface ResultadoBusca {
  dados: DadosEdital[];
  totalRegistros: number;
  pagina: number;
  totalPaginas: number;
}

// ==================== PNCP - API PÚBLICA GOV.BR ====================

interface PNCPCompra {
  numeroControlePNCP: string;
  numeroCompra: string;
  processo: string;
  objetoCompra: string;
  valorTotalEstimado: number;
  valorTotalHomologado: number | null;
  modalidadeId: number;
  modalidadeNome: string;
  modoDisputaNome: string;
  dataPublicacaoPncp: string;
  dataAberturaProposta: string;
  dataEncerramentoProposta: string;
  informacaoComplementar: string;
  linkSistemaOrigem: string | null;
  linkProcessoEletronico: string | null;
  situacaoCompraNome: string;
  srp: boolean;
  orgaoEntidade: {
    cnpj: string;
    razaoSocial: string;
    poderId: string;
    esferaId: string;
  };
  unidadeOrgao: {
    ufNome: string;
    ufSigla: string;
    municipioNome: string;
    nomeUnidade: string;
    codigoUnidade: string;
    codigoIbge: string;
  };
  amparoLegal: {
    codigo: number;
    nome: string;
    descricao: string;
  };
}

interface PNCPListResponse {
  data: PNCPCompra[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
  empty: boolean;
}

function pncpParaDadosEdital(compra: PNCPCompra): DadosEdital {
  const dataAbertura = compra.dataAberturaProposta || compra.dataPublicacaoPncp;
  const data = dataAbertura ? new Date(dataAbertura) : new Date();

  return {
    numero: compra.numeroCompra || compra.processo,
    objeto: compra.objetoCompra,
    orgao: compra.orgaoEntidade.razaoSocial,
    modalidade: compra.modalidadeNome,
    valorEstimado: compra.valorTotalEstimado || 0,
    dataCertame: data.toISOString().split('T')[0],
    horaCertame: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    prazoEntrega: '',
    localEntrega: `${compra.unidadeOrgao.municipioNome} - ${compra.unidadeOrgao.ufSigla}`,
    linkSistemaOrigem: compra.linkSistemaOrigem || undefined,
    numeroControlePNCP: compra.numeroControlePNCP,
    codigoUnidade: compra.unidadeOrgao.codigoUnidade,
    fonte: 'pncp',
  };
}

/**
 * Busca licitações no PNCP por texto, período e modalidade
 */
export async function buscarPNCP(params: {
  q?: string;
  dataInicial: string; // formato YYYYMMDD
  dataFinal: string;   // formato YYYYMMDD
  codigoModalidadeContratacao?: number;
  codigoUnidadeAdministrativa?: string;
  uf?: string;
  pagina?: number;
  tamanhoPagina?: number;
}): Promise<ResultadoBusca> {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set('q', params.q);
  searchParams.set('dataInicial', params.dataInicial);
  searchParams.set('dataFinal', params.dataFinal);
  searchParams.set('codigoModalidadeContratacao', String(params.codigoModalidadeContratacao || 6));
  if (params.codigoUnidadeAdministrativa) searchParams.set('codigoUnidadeAdministrativa', params.codigoUnidadeAdministrativa);
  if (params.uf) searchParams.set('uf', params.uf);
  searchParams.set('pagina', String(params.pagina || 1));
  searchParams.set('tamanhoPagina', String(params.tamanhoPagina || 10));

  const res = await fetch(
    `${PNCP_API_URL}/contratacoes/publicacao?${searchParams.toString()}`
  );

  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.message || `Erro na API PNCP: ${res.status}`);
  }

  const json: PNCPListResponse = await res.json();

  return {
    dados: json.data.map(pncpParaDadosEdital),
    totalRegistros: json.totalRegistros,
    pagina: json.numeroPagina,
    totalPaginas: json.totalPaginas,
  };
}

/**
 * Busca uma compra específica no PNCP pelo CNPJ do órgão, ano e sequencial
 */
export async function buscarCompraPNCP(
  cnpj: string,
  ano: number,
  sequencial: number
): Promise<DadosEdital> {
  const res = await fetch(
    `${PNCP_API_URL}/orgaos/${cnpj}/compras/${ano}/${sequencial}`
  );

  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.message || `Compra não encontrada no PNCP: ${res.status}`);
  }

  const compra: PNCPCompra = await res.json();
  return pncpParaDadosEdital(compra);
}

// ==================== CONLICITAÇÃO - API PRIVADA ====================

async function fetchConlicitacao<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  if (!CONLICITACAO_API_URL || !CONLICITACAO_TOKEN) {
    throw new Error('API do Conlicitação não configurada.');
  }

  const url = new URL(`${CONLICITACAO_API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CONLICITACAO_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Erro na API Conlicitação: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ==================== BUSCA UNIFICADA ====================

/**
 * Busca edital usando a melhor fonte disponível:
 * 1. Conlicitação (se configurado)
 * 2. PNCP (fallback público)
 */
export async function buscarEdital(termo: string, uasg?: string): Promise<DadosEdital[]> {
  // Se o Conlicitação está configurado, usar como fonte primária
  if (isConlicitacaoConfigurado()) {
    try {
      const params: Record<string, string> = { numero: termo };
      if (uasg) params.uasg = uasg;
      const dados = await fetchConlicitacao<DadosEdital>('/edital', params);
      return [{ ...dados, fonte: 'conlicitacao' }];
    } catch {
      // Fallback para PNCP se Conlicitação falhar
    }
  }

  // Fallback: buscar no PNCP (últimos 6 meses)
  const agora = new Date();
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

  const formatarData = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const resultado = await buscarPNCP({
    q: termo,
    codigoUnidadeAdministrativa: uasg,
    dataInicial: formatarData(seisMesesAtras),
    dataFinal: formatarData(agora),
    tamanhoPagina: 10,
  });

  // Filtrar por UASG (código da unidade) se informado
  if (uasg) {
    const filtrados = resultado.dados.filter((d) => d.codigoUnidade === uasg);
    return filtrados.length > 0 ? filtrados : resultado.dados;
  }

  return resultado.dados;
}

/**
 * Busca dados de um edital pela URL do Conlicitação
 */
export async function buscarEditalPorUrl(url: string): Promise<DadosEdital[]> {
  if (isConlicitacaoConfigurado()) {
    try {
      const match = url.match(/\/(\d+)\/?$/);
      const codigo = match ? match[1] : url;
      const dados = await fetchConlicitacao<DadosEdital>('/edital', { codigo });
      return [{ ...dados, fonte: 'conlicitacao' }];
    } catch {
      // Fallback para busca por texto
    }
  }

  // Extrair possível termo de busca da URL
  const termo = url.split('/').pop() || url;
  return buscarEdital(termo);
}

/**
 * Verifica se a API do Conlicitação está configurada
 */
export function isConlicitacaoConfigurado(): boolean {
  return Boolean(CONLICITACAO_API_URL && CONLICITACAO_TOKEN);
}

/**
 * Verifica se há alguma fonte de dados disponível (PNCP sempre está)
 */
export function isApiDisponivel(): boolean {
  return true; // PNCP é pública, sempre disponível
}

// ==================== CÓDIGOS DE MODALIDADE PNCP ====================

export const MODALIDADES_PNCP: Record<number, string> = {
  1: 'Leilão - Eletrônico',
  2: 'Diálogo Competitivo',
  3: 'Concurso',
  4: 'Concorrência - Eletrônica',
  5: 'Concorrência - Presencial',
  6: 'Pregão - Eletrônico',
  7: 'Pregão - Presencial',
  8: 'Dispensa',
  9: 'Inexigibilidade',
  10: 'Manifestação de Interesse',
  11: 'Pré-qualificação',
  12: 'Credenciamento',
  13: 'Leilão - Presencial',
};
