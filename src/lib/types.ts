import { Timestamp } from 'firebase/firestore';

// ==================== LICITAÇÕES ====================

export type LicitacaoStatus =
  | 'em_analise'
  | 'aguardando_certame'
  | 'aguardando_entrega'
  | 'aguardando_pagamento'
  | 'concluida'
  | 'cancelada';

export type Modalidade =
  | 'Pregão Eletrônico'
  | 'Pregão Presencial'
  | 'Concorrência'
  | 'Tomada de Preços'
  | 'Convite'
  | 'Dispensa'
  | 'Inexigibilidade';

export interface Licitacao {
  id?: string;
  numero: string;
  objeto: string;
  orgao: string;
  modalidade: Modalidade | string;
  valorEstimado: number;
  dataCertame: Timestamp;
  horaCertame: string;
  prazoEntrega: string;
  localEntrega: string;
  status: LicitacaoStatus;
  resumoIA: string;
  urlConlicitacao?: string;
  codigoPNCP?: string;
  clientId: string;
  criadoPor: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ==================== EVENTOS / AGENDA ====================

export type TipoEvento =
  | 'sessao_publica'
  | 'revisao'
  | 'entrega'
  | 'certidao'
  | 'pagamento';

export interface Evento {
  id?: string;
  titulo: string;
  descricao: string;
  tipo: TipoEvento;
  dataHora: Timestamp;
  licitacaoId?: string;
  licitacaoNumero?: string;
  urgente: boolean;
  concluido: boolean;
  clientId: string;
  criadoPor: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ==================== CERTIDÕES ====================

export type TipoCertidao =
  | 'cnd_federal'
  | 'fgts'
  | 'cndt'
  | 'estadual'
  | 'municipal'
  | 'falencia';

export type CertidaoStatus = 'valida' | 'vencendo' | 'vencida' | 'pendente';

export interface Certidao {
  id?: string;
  tipo: TipoCertidao;
  nome: string;
  status: CertidaoStatus;
  dataEmissao: Timestamp | null;
  dataValidade: Timestamp | null;
  diasRestantes: number;
  urlPortal: string;
  arquivoUrl?: string;
  clientId: string;
  atualizadoEm: Timestamp;
}

// ==================== PAGAMENTOS ====================

export type PagamentoStatus = 'aguardando' | 'recebido';

export interface Pagamento {
  id?: string;
  licitacaoId: string;
  licitacaoNumero: string;
  orgao: string;
  objeto: string;
  valor: number;
  dataEntrega: Timestamp;
  dataPagamento: Timestamp | null;
  status: PagamentoStatus;
  diasAtraso: number;
  notaFiscal?: string;
  clientId: string;
  criadoPor: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ==================== USUÁRIOS (já existe, formalizando) ====================

export type UserRole = 'super_admin' | 'admin' | 'operador';

export interface UserProfile {
  id?: string;
  email: string;
  nome: string;
  role: UserRole;
  clientId: string;
  criadoEm: Timestamp;
  ultimoLogin: Timestamp;
}

// ==================== HELPERS ====================

export const CERTIDAO_NOMES: Record<TipoCertidao, string> = {
  cnd_federal: 'CND Federal',
  fgts: 'CRF/FGTS',
  cndt: 'CNDT Trabalhista',
  estadual: 'CND Estadual',
  municipal: 'CND Municipal',
  falencia: 'Certidão de Falência',
};

export const CERTIDAO_PORTAIS: Record<TipoCertidao, string> = {
  cnd_federal: 'https://solucoes.receita.fazenda.gov.br/Servicos/CertidaoInternet/PJ/Emitir',
  fgts: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf',
  cndt: 'https://www.tst.jus.br/certidao1',
  estadual: '',
  municipal: '',
  falencia: '',
};

export const STATUS_LABELS: Record<LicitacaoStatus, string> = {
  em_analise: 'Em Análise',
  aguardando_certame: 'Aguard. Certame',
  aguardando_entrega: 'Aguard. Entrega',
  aguardando_pagamento: 'Aguard. Pagamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const EVENTO_LABELS: Record<TipoEvento, string> = {
  sessao_publica: 'Sessão Pública',
  revisao: 'Revisão',
  entrega: 'Entrega',
  certidao: 'Certidão',
  pagamento: 'Pagamento',
};
