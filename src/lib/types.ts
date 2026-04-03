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

export interface AnaliseEdital {
  processo?: string;
  fusoHorario?: string;
  baseLegal?: string;
  enquadramentoEmpresa?: string;
  valorIntervaloLance?: string;
  formalizacao?: string;
  portal?: string;
  criterioJulgamento?: string;
  modoDisputa?: string;
  dataLimiteCadastramento?: string;
  garantiaContrato?: string;
  validadeProposta?: string;
  vigenciaTotalContrato?: string;
  pagamento?: string;
  recurso?: string;
  propostaAdequada?: string;
  assinaturaContrato?: string;
  documentacao?: string;
  garantiaContratoDetalhe?: string;
  proposta?: string;
  propostaRevisada?: string;
  habilitacaoJuridica?: string;
  regularidadeFiscal?: string;
  qualificacaoEconomica?: string;
  qualificacaoTecnica?: string;
  declaracoes?: string;
  julgamentoProposta?: string;
  declaradoVencedor?: string;
  faturamentoEntrega?: string;
  observacoes?: string;
}

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
  numeroControlePNCP?: string;
  linkSistemaOrigem?: string;
  processo?: string;
  baseLegal?: string;
  modoDisputa?: string;
  srp?: boolean;
  analise?: AnaliseEdital;
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

// ==================== USUÁRIOS ====================

export type UserRole = 'super_admin' | 'admin' | 'operador' | 'cliente';

export interface UserProfile {
  id?: string;
  email: string;
  nome: string;
  role: UserRole;
  clientId: string;
  criadoEm: Timestamp;
  ultimoLogin: Timestamp;
}

// ==================== SOLICITAÇÕES ====================

export type SolicitacaoStatus = 'pendente' | 'em_analise' | 'concluida' | 'recusada';

export interface Solicitacao {
  id?: string;
  numeroConlicitacao: string;
  uasg?: string;
  clientId: string;
  clientNome?: string;
  status: SolicitacaoStatus;
  observacoesCliente?: string;
  observacoesAdmin?: string;
  licitacaoId?: string;
  criadoPor: string;
  processadoPor?: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ==================== DOCUMENTOS ====================

export type DocumentoStatus = 'enviado' | 'validado' | 'recusado';

export type TipoDocumento =
  | 'certidao'
  | 'proposta'
  | 'contrato'
  | 'nota_fiscal'
  | 'habilitacao'
  | 'outro';

export interface Documento {
  id?: string;
  nome: string;
  descricao?: string;
  tipo: TipoDocumento;
  arquivoUrl: string;
  arquivoPath: string;
  tamanhoBytes: number;
  mimeType: string;
  licitacaoId?: string;
  licitacaoNumero?: string;
  clientId: string;
  status: DocumentoStatus;
  motivoRecusa?: string;
  enviadoPor: string;
  validadoPor?: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ==================== CLIENTES (configurações) ====================

export interface ClienteInfo {
  id?: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco?: string;
  telefone?: string;
  emailContato?: string;
  porteEmpresa?: string;
  modalidadesInteresse: string[];
  ufsInteresse: string[];
  valorMinimo?: number;
  valorMaximo?: number;
  palavrasChaveObjeto?: string[];
  documentosObrigatorios: string[];
  observacoes?: string;
  atualizadoEm: Timestamp;
  atualizadoPor: string;
}

// ==================== RELATÓRIO DE LICITAÇÕES ====================

export type FaseRelatorio = 'pedido' | 'analise' | 'certame' | 'classificacao' | 'resultado';

export type ResultadoLicitacao =
  | 'vencemos'
  | 'finalizada'
  | 'em_andamento'
  | 'suspensa'
  | 'revogada'
  | 'anulada'
  | 'desclassificada'
  | 'aguardando';

export interface RelatorioLicitacao {
  id?: string;
  mes: string;
  sequencial: string;
  conlicitacaoOrgao: string;
  observacoes?: string;
  valorEstimado: number;
  status: string;
  resultado: ResultadoLicitacao;
  dataPedido?: Timestamp;
  dataCertame?: Timestamp;
  analise: 'ok' | 'pendente';
  classificacao?: string;
  precoCliente?: number;
  motivo?: string;
  empresaVencedora?: string;
  valorFinal?: number;
  liberadoParaCliente: boolean;
  licitacaoId?: string;
  clientId: string;
  criadoPor: string;
  atualizadoPor?: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
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

export const SOLICITACAO_STATUS_LABELS: Record<SolicitacaoStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  concluida: 'Concluída',
  recusada: 'Recusada',
};

export const DOCUMENTO_STATUS_LABELS: Record<DocumentoStatus, string> = {
  enviado: 'Enviado',
  validado: 'Validado',
  recusado: 'Recusado',
};

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  certidao: 'Certidão',
  proposta: 'Proposta',
  contrato: 'Contrato',
  nota_fiscal: 'Nota Fiscal',
  habilitacao: 'Habilitação',
  outro: 'Outro',
};

export const FASE_LABELS: Record<FaseRelatorio, string> = {
  pedido: 'Pedido',
  analise: 'Análise',
  certame: 'Certame',
  classificacao: 'Classificação',
  resultado: 'Resultado',
};

export const RESULTADO_CORES: Record<ResultadoLicitacao, string> = {
  vencemos: 'bg-green-500',
  finalizada: 'bg-red-500',
  em_andamento: 'bg-yellow-500',
  suspensa: 'bg-gray-400',
  revogada: 'bg-gray-400',
  anulada: 'bg-gray-400',
  desclassificada: 'bg-red-500',
  aguardando: 'bg-yellow-500',
};
