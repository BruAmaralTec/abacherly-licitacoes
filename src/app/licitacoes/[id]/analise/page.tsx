'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  Save,
  Loader2,
  FileDown,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { PageSkeleton } from '@/components/Skeleton';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { buscarLicitacao, atualizarLicitacao } from '@/lib/services/licitacoes';
import { formatarAnaliseListas } from '@/lib/formatarListas';
import { Licitacao, AnaliseEdital } from '@/lib/types';

type TabId =
  | 'atencoes'
  | 'edital'
  | 'objeto'
  | 'tecnico'
  | 'habilitacao'
  | 'fiscal'
  | 'economico';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'atencoes', label: 'Atenções' },
  { id: 'edital', label: 'Edital' },
  { id: 'objeto', label: 'Objeto' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'habilitacao', label: 'Habilitação para concorrer' },
  { id: 'fiscal', label: 'Reg. fiscal e trabalhista' },
  { id: 'economico', label: 'Econômico' },
];

export default function AnalisePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading, isCliente } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [licitacao, setLicitacao] = useState<Licitacao | null>(null);
  const [analise, setAnalise] = useState<AnaliseEdital>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [dataHoje, setDataHoje] = useState('');
  const [tabAtiva, setTabAtiva] = useState<TabId>('edital');

  useEffect(() => {
    setDataHoje(
      new Date().toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await buscarLicitacao(id);
        if (!dados) {
          router.push('/licitacoes');
          return;
        }
        setLicitacao(dados);
        // Auto-formata listas (a) b) c), 1) 2), 1.1, etc) em parágrafos separados.
        // Aplica só na carga; analista pode editar livremente depois.
        setAnalise(formatarAnaliseListas(dados.analise || {}));
      } catch (error) {
        console.error('Erro ao carregar licitação:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (id && !loading) carregar();
  }, [id, loading]);

  const handleSalvar = async () => {
    if (!licitacao?.id) return;
    setSalvando(true);
    try {
      await atualizarLicitacao(licitacao.id, { analise });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar análise:', error);
    } finally {
      setSalvando(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleExportarWord = async () => {
    if (!licitacao) return;
    setExportando(true);
    try {
      const { exportarAnaliseWord } = await import('@/lib/services/exportarWord');
      await exportarAnaliseWord(licitacao, analise);
    } catch (error) {
      console.error('Erro ao exportar Word:', error);
    } finally {
      setExportando(false);
    }
  };

  const upd = (campo: keyof AnaliseEdital, valor: string) => {
    setAnalise((prev) => ({ ...prev, [campo]: valor }));
    setSalvo(false);
  };

  const updFlag = (blocoId: string, chave: 'conferido' | 'enviar', valor: boolean) => {
    setAnalise((prev) => ({
      ...prev,
      flagsExport: {
        ...(prev.flagsExport || {}),
        [blocoId]: { ...(prev.flagsExport?.[blocoId] || {}), [chave]: valor },
      },
    }));
    setSalvo(false);
  };
  const flagsDe = (blocoId: string) => analise.flagsExport?.[blocoId] || {};
  const blocoProps = (id: string) => ({
    flagId: id,
    conferido: flagsDe(id).conferido,
    enviar: flagsDe(id).enviar,
    onFlagChange: (c: 'conferido' | 'enviar', v: boolean) => updFlag(id, c, v),
  });

  if (loading || !user || carregando) {
    return (
      <div className="min-h-screen w-full bg-[#f8fafc]">
        <Sidebar />
        <div className="w-full lg:pl-64 min-h-screen flex flex-col">
          <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
            <PageSkeleton />
          </main>
        </div>
      </div>
    );
  }

  if (!licitacao) return null;

  const dataCertame = licitacao.dataCertame?.toDate();
  const dataCertameStr = dataCertame
    ? `${dataCertame.toLocaleDateString('pt-BR')} ${
        licitacao.horaCertame ||
        dataCertame.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }`
    : '';

  const valorFmt = licitacao.valorEstimado
    ? licitacao.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '';

  const temAtencoes = !!analise.atencoes?.trim();

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="w-full lg:pl-64 print:pl-0 min-h-screen flex flex-col">
        {/* Toolbar */}
        <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/licitacoes"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#1a2b45]" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-[#2c4a70]">Análise do Edital</h1>
                <p className="text-xs text-[#1a2b45]/60">
                  #{licitacao.numero} - {licitacao.orgao}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {salvo && <span className="text-sm text-green-600 font-medium">Salvo!</span>}
              {!isCliente && (
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
                >
                  {salvando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </button>
              )}
              <button
                onClick={handleExportarWord}
                disabled={exportando}
                className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
              >
                {exportando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                Word
              </button>
              <button
                onClick={handleImprimir}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
              >
                <Printer className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Tabs (não imprime) — sticky logo abaixo da toolbar */}
        <div className="print:hidden sticky top-[60px] z-[9] bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 shadow-sm">
          <div className="flex flex-wrap gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const ativo = tabAtiva === t.id;
              const ehAtencoes = t.id === 'atencoes';
              return (
                <button
                  key={t.id}
                  onClick={() => setTabAtiva(t.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                    ativo
                      ? ehAtencoes
                        ? 'border-red-500 text-red-600'
                        : 'border-[#2c4a70] text-[#2c4a70]'
                      : 'border-transparent text-[#1a2b45]/60 hover:text-[#1a2b45]'
                  }`}
                >
                  {ehAtencoes && (
                    <AlertTriangle
                      className={`w-4 h-4 ${temAtencoes ? 'text-red-500' : 'text-gray-400'}`}
                    />
                  )}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Documento — tela mostra só a aba ativa, impressão mostra todas empilhadas */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-10 print:p-0">
          <div
            ref={printRef}
            className="w-full max-w-7xl print:max-w-none mx-auto bg-white shadow-lg print:shadow-none rounded-lg print:rounded-none"
          >
            <div className="p-6 sm:p-10 lg:p-14 print:p-[2cm] space-y-8 text-[#1a2b45] text-[15px] leading-relaxed">
              {/* Cabeçalho — logo à ESQUERDA, título à direita */}
              <div className="border-b-2 border-[#d64b16] pb-6 flex items-center gap-6">
                <Image
                  src="/images/logo-azul.png"
                  alt="Abächerly Licitações"
                  width={500}
                  height={500}
                  priority
                  className="w-auto h-32 sm:h-40 lg:h-44 print:h-32 flex-shrink-0"
                />
                <div className="flex-1 text-right">
                  <h1 className="text-3xl lg:text-4xl font-bold text-[#2c4a70] tracking-wide">
                    ANÁLISE DO EDITAL
                  </h1>
                  <p className="text-lg text-[#1a2b45]/80 mt-3">
                    Nº Conlicitação{' '}
                    <span className="font-bold">
                      {licitacao.numeroControlePNCP || licitacao.codigoPNCP || '—'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Título do edital — sempre */}
              <div className="bg-[#2c4a70] text-white p-4 rounded-lg print:rounded-none text-center">
                <p className="font-bold text-base">
                  EDITAL {licitacao.modalidade?.toUpperCase()} Nº {licitacao.numero}
                  {licitacao.srp ? ' SISTEMA DE REGISTRO DE PREÇOS' : ''}
                </p>
                {licitacao.processo && (
                  <p className="text-white/80 text-sm mt-1">
                    Processo Administrativo nº: {licitacao.processo}
                  </p>
                )}
              </div>

              {/* ============ ABA: ATENÇÕES ============ */}
              <SecaoAba ativa={tabAtiva === 'atencoes'} id="atencoes">
                <Bloco titulo="ATENÇÃO — RISCOS E PONTOS CRÍTICOS" cor="vermelho" {...blocoProps('atencoes')}>
                  <CampoLongo
                    valor={analise.atencoes || ''}
                    onChange={(v) => upd('atencoes', v)}
                    placeholder="Liste aqui os pontos de risco do edital com citação literal numerada (presencial obrigatório, subcontratação vedada, garantia, prazos curtos, etc.)..."
                    readOnly={isCliente}
                  />
                </Bloco>
              </SecaoAba>

              {/* ============ ABA: EDITAL ============ */}
              <SecaoAba ativa={tabAtiva === 'edital'} id="edital">
                <Bloco titulo="RESUMO - CONDIÇÕES DE PARTICIPAÇÃO E FORNECIMENTO" {...blocoProps('resumo')}>
                  <LinhaInput
                    label="Data do Certame"
                    valor={analise.dataCertame || dataCertameStr}
                    onChange={(v) => upd('dataCertame', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Fuso Horário"
                    valor={analise.fusoHorario || ''}
                    onChange={(v) => upd('fusoHorario', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Modalidade"
                    valor={analise.modalidade || licitacao.modalidade || ''}
                    onChange={(v) => upd('modalidade', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Órgão"
                    valor={analise.orgao || licitacao.orgao || ''}
                    onChange={(v) => upd('orgao', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Base Legal"
                    valor={analise.baseLegal || licitacao.baseLegal || ''}
                    onChange={(v) => upd('baseLegal', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Portal"
                    valor={analise.portal || ''}
                    onChange={(v) => upd('portal', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Valor"
                    valor={analise.valor || valorFmt}
                    onChange={(v) => upd('valor', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Intervalo de Lance"
                    valor={analise.valorIntervaloLance || ''}
                    onChange={(v) => upd('valorIntervaloLance', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Critério de Julgamento"
                    valor={analise.criterioJulgamento || ''}
                    onChange={(v) => upd('criterioJulgamento', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Modo de Disputa"
                    valor={analise.modoDisputa || licitacao.modoDisputa || ''}
                    onChange={(v) => upd('modoDisputa', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Validade da Proposta"
                    valor={analise.validadeProposta || ''}
                    onChange={(v) => upd('validadeProposta', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Recurso"
                    valor={analise.recurso || ''}
                    onChange={(v) => upd('recurso', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Data Limite Credenciamento"
                    valor={analise.dataLimiteCredenciamento || ''}
                    onChange={(v) => upd('dataLimiteCredenciamento', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Data Limite Cadastramento"
                    valor={analise.dataLimiteCadastramento || ''}
                    onChange={(v) => upd('dataLimiteCadastramento', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Data Limite Esclarecimentos"
                    valor={analise.dataLimiteEsclarecimentos || ''}
                    onChange={(v) => upd('dataLimiteEsclarecimentos', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Proposta Adequada"
                    valor={analise.propostaAdequada || ''}
                    onChange={(v) => upd('propostaAdequada', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Prazo p/ Assinatura do Contrato"
                    valor={analise.prazoAssinaturaContrato || analise.assinaturaContrato || ''}
                    onChange={(v) => upd('prazoAssinaturaContrato', v)}
                    readOnly={isCliente}
                  />
                </Bloco>
              </SecaoAba>

              {/* ============ ABA: OBJETO ============ */}
              <SecaoAba ativa={tabAtiva === 'objeto'} id="objeto">
                <Bloco titulo="OBJETO E EXECUÇÃO" {...blocoProps('objeto_execucao')}>
                  <LinhaInput
                    label="Órgão"
                    valor={analise.orgao || licitacao.orgao || ''}
                    onChange={(v) => upd('orgao', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Objeto"
                    valor={analise.objeto || licitacao.objeto || ''}
                    onChange={(v) => upd('objeto', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Vigência Total do Contrato"
                    valor={analise.vigenciaTotalContrato || ''}
                    onChange={(v) => upd('vigenciaTotalContrato', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Formalização"
                    valor={analise.formalizacao || (licitacao.srp ? 'Ata de Registro de Preços' : '')}
                    onChange={(v) => upd('formalizacao', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Prazo de Entrega"
                    valor={analise.prazoEntrega || licitacao.prazoEntrega || ''}
                    onChange={(v) => upd('prazoEntrega', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Pagamento"
                    valor={analise.pagamento || ''}
                    onChange={(v) => upd('pagamento', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Garantia de Contrato (Resumo)"
                    valor={analise.garantiaContrato || ''}
                    onChange={(v) => upd('garantiaContrato', v)}
                    readOnly={isCliente}
                  />
                  <LinhaInput
                    label="Assinatura do Contrato"
                    valor={analise.assinaturaContrato || ''}
                    onChange={(v) => upd('assinaturaContrato', v)}
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="GARANTIA DE CONTRATO" {...blocoProps('garantia_contrato')}>
                  <CampoLongo
                    valor={analise.garantiaContratoDetalhe || analise.garantiaDeContrato || ''}
                    onChange={(v) => upd('garantiaContratoDetalhe', v)}
                    placeholder="Detalhes da garantia: percentual, modalidades aceitas, prazos..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="DO FATURAMENTO / ENTREGA DO SERVIÇO" {...blocoProps('faturamento_entrega')}>
                  <CampoLongo
                    valor={analise.faturamentoEntrega || ''}
                    onChange={(v) => upd('faturamentoEntrega', v)}
                    placeholder="Condições de faturamento, banco preferencial, certidões exigidas..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="PRAZOS" {...blocoProps('prazos')}>
                  <CampoLongo
                    valor={analise.prazos || ''}
                    onChange={(v) => upd('prazos', v)}
                    placeholder="Prazos adicionais não cobertos acima..."
                    readOnly={isCliente}
                  />
                </Bloco>
              </SecaoAba>

              {/* ============ ABA: TÉCNICO ============ */}
              <SecaoAba ativa={tabAtiva === 'tecnico'} id="tecnico">
                <Bloco titulo="QUALIFICAÇÃO TÉCNICA" {...blocoProps('qualificacao_tecnica')}>
                  <CampoLongo
                    valor={analise.qualificacaoTecnica || ''}
                    onChange={(v) => upd('qualificacaoTecnica', v)}
                    placeholder="Atestados de capacidade técnica, requisitos do objeto, perfis profissionais..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="DOCUMENTAÇÃO" {...blocoProps('documentacao')}>
                  <CampoLongo
                    valor={analise.documentacao || ''}
                    onChange={(v) => upd('documentacao', v)}
                    placeholder="Documentação exigida, anexos, questionamentos, credenciamento..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="PROVA DE CONCEITO" {...blocoProps('prova_conceito')}>
                  <CampoLongo
                    valor={analise.provaDeConceito || ''}
                    onChange={(v) => upd('provaDeConceito', v)}
                    placeholder="Itens, percentual mínimo, prazo, formato — vazio se não exigida..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="AMOSTRA" {...blocoProps('amostra')}>
                  <CampoLongo
                    valor={analise.amostra || ''}
                    onChange={(v) => upd('amostra', v)}
                    placeholder="Detalhes da amostra exigida — vazio se não houver..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="VISTORIA" {...blocoProps('vistoria')}>
                  <CampoLongo
                    valor={analise.vistoria || ''}
                    onChange={(v) => upd('vistoria', v)}
                    placeholder="Procedimento, agendamento, declaração de abstenção..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="PROPOSTA" {...blocoProps('proposta')}>
                  <CampoLongo
                    valor={analise.proposta || ''}
                    onChange={(v) => upd('proposta', v)}
                    placeholder="Como enviar, conteúdo exigido, planilha de custos..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="PROPOSTA REVISADA" {...blocoProps('proposta_revisada')}>
                  <CampoLongo
                    valor={analise.propostaRevisada || ''}
                    onChange={(v) => upd('propostaRevisada', v)}
                    placeholder="Condições para proposta revisada após negociação..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="JULGAMENTO DA PROPOSTA" {...blocoProps('julgamento_proposta')}>
                  <CampoLongo
                    valor={analise.julgamentoProposta || ''}
                    onChange={(v) => upd('julgamentoProposta', v)}
                    placeholder="Critérios de aceitabilidade, negociação, MPE..."
                    readOnly={isCliente}
                  />
                </Bloco>
              </SecaoAba>

              {/* ============ ABA: HABILITAÇÃO PARA CONCORRER ============ */}
              <SecaoAba ativa={tabAtiva === 'habilitacao'} id="habilitacao">
                <Bloco titulo="ENQUADRAMENTO DA EMPRESA" {...blocoProps('enquadramento_empresa')}>
                  <CampoLongo
                    valor={analise.enquadramentoEmpresa || ''}
                    onChange={(v) => upd('enquadramentoEmpresa', v)}
                    placeholder="ME, EPP, Demais, etc..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="HABILITAÇÃO JURÍDICA" {...blocoProps('habilitacao_juridica')}>
                  <CampoLongo
                    valor={analise.habilitacaoJuridica || ''}
                    onChange={(v) => upd('habilitacaoJuridica', v)}
                    placeholder="SICAF, CEIS, CNEP, CNIA, ato constitutivo..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="DECLARAÇÕES" {...blocoProps('declaracoes')}>
                  <CampoLongo
                    valor={analise.declaracoes || ''}
                    onChange={(v) => upd('declaracoes', v)}
                    placeholder="MPE, menor, trabalho degradante, reserva de cargos..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="DECLARADO VENCEDOR / ASSINATURA DO CONTRATO" {...blocoProps('declarado_vencedor')}>
                  <CampoLongo
                    valor={analise.declaradoVencedor || ''}
                    onChange={(v) => upd('declaradoVencedor', v)}
                    placeholder="Prazo, certificação digital, termo de responsabilidade..."
                    readOnly={isCliente}
                  />
                </Bloco>
              </SecaoAba>

              {/* ============ ABA: REGULARIZAÇÃO FISCAL E TRABALHISTA ============ */}
              <SecaoAba ativa={tabAtiva === 'fiscal'} id="fiscal">
                <Bloco titulo="REGULARIDADE FISCAL E TRABALHISTA" {...blocoProps('regularidade_fiscal')}>
                  <CampoLongo
                    valor={analise.regularidadeFiscal || ''}
                    onChange={(v) => upd('regularidadeFiscal', v)}
                    placeholder="CNPJ, Fazenda Federal/Estadual/Municipal, FGTS, CNDT..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="CONTRATAÇÃO DE MÃO DE OBRA" {...blocoProps('contratacao_mao_obra')}>
                  <CampoLongo
                    valor={analise.contratacaoMaoObra || ''}
                    onChange={(v) => upd('contratacaoMaoObra', v)}
                    placeholder="CLT / PJ / Subcontratação..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="REMOTO OU PRESENCIAL" {...blocoProps('remoto_presencial')}>
                  <CampoLongo
                    valor={analise.remotoOuPresencial || ''}
                    onChange={(v) => upd('remotoOuPresencial', v)}
                    placeholder="Citação literal do item do edital com endereço e regime..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="DEDICAÇÃO EXCLUSIVA DOS PERFIS" {...blocoProps('dedicacao_exclusiva')}>
                  <CampoLongo
                    valor={analise.dedicacaoExclusivaPerfis || ''}
                    onChange={(v) => upd('dedicacaoExclusivaPerfis', v)}
                    placeholder="Sim/Não + referência ao item..."
                    readOnly={isCliente}
                  />
                </Bloco>
              </SecaoAba>

              {/* ============ ABA: ECONÔMICO ============ */}
              <SecaoAba ativa={tabAtiva === 'economico'} id="economico">
                <Bloco titulo="QUALIFICAÇÃO ECONÔMICA FINANCEIRA" {...blocoProps('qualificacao_economica')}>
                  <CampoLongo
                    valor={analise.qualificacaoEconomica || ''}
                    onChange={(v) => upd('qualificacaoEconomica', v)}
                    placeholder="Balanço patrimonial, índices LG/SG/LC, patrimônio líquido mínimo..."
                    readOnly={isCliente}
                  />
                </Bloco>
                <Bloco titulo="OBSERVAÇÕES" {...blocoProps('observacoes')}>
                  <CampoLongo
                    valor={analise.observacoes || ''}
                    onChange={(v) => upd('observacoes', v)}
                    placeholder="Anotações operacionais (pendências internas, aguardando documentos, etc.)..."
                    readOnly={isCliente}
                  />
                </Bloco>
              </SecaoAba>

              {/* Rodapé — sempre */}
              <div className="border-t-2 border-[#d64b16] pt-6 mt-8">
                <p className="text-xs text-[#1a2b45]/60 italic">
                  Em caso de dúvidas consultar o edital e seus anexos, este resumo não exime a
                  leitura total dos documentos oficiais da presente licitação.
                </p>
                <div className="mt-6 text-center">
                  <p className="text-sm text-[#1a2b45]/80" suppressHydrationWarning>
                    Itu, {dataHoje}
                  </p>
                  <p className="mt-4 text-sm font-bold text-[#2c4a70]">Atenciosamente,</p>
                  <p className="text-sm text-[#2c4a70]">Érika Abächerly</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="print:hidden">
          <Footer />
        </div>
      </div>

      {/* Estilo para impressão: mostra todas as abas empilhadas, esconde estado tabAtiva */}
      <style jsx global>{`
        @media print {
          .secao-aba {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

// ==================== COMPONENTES AUXILIARES ====================

function SecaoAba({
  ativa,
  id,
  children,
}: {
  ativa: boolean;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-aba={id}
      className={`secao-aba space-y-6 ${ativa ? '' : 'hidden'}`}
    >
      {children}
    </section>
  );
}

function Bloco({
  titulo,
  cor = 'azul',
  flagId,
  conferido,
  enviar,
  onFlagChange,
  children,
}: {
  titulo: string;
  cor?: 'azul' | 'vermelho';
  flagId?: string;
  conferido?: boolean;
  enviar?: boolean;
  onFlagChange?: (chave: 'conferido' | 'enviar', valor: boolean) => void;
  children: React.ReactNode;
}) {
  const borda = cor === 'vermelho' ? 'border-red-500' : 'border-[#d64b16]/30';
  const corTitulo = cor === 'vermelho' ? 'text-red-700' : 'text-[#2c4a70]';
  return (
    <div>
      <div className={`flex flex-wrap items-center gap-3 border-b ${borda} pb-2 mb-4`}>
        <h2 className={`text-base font-bold ${corTitulo} flex-1`}>{titulo}</h2>
        {flagId && onFlagChange && (
          <div className="flex items-center gap-4 print:hidden">
            <label className="flex items-center gap-1.5 text-xs text-[#1a2b45]/70 cursor-pointer hover:text-[#1a2b45]">
              <input
                type="checkbox"
                checked={!!conferido}
                onChange={(e) => onFlagChange('conferido', e.target.checked)}
                className="w-4 h-4 accent-green-600 cursor-pointer"
              />
              Conferido
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[#1a2b45]/70 cursor-pointer hover:text-[#1a2b45]">
              <input
                type="checkbox"
                checked={!!enviar}
                onChange={(e) => onFlagChange('enviar', e.target.checked)}
                className="w-4 h-4 accent-[#4674e8] cursor-pointer"
              />
              Enviar no doc cliente
            </label>
          </div>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * Linha do RESUMO: label fixo à esquerda, valor cresce verticalmente conforme
 * o texto (contentEditable, sem barra horizontal). Mantém estética de linha
 * em campos curtos e expande quando necessário.
 */
function LinhaInput({
  label,
  valor,
  onChange,
  readOnly,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.textContent !== valor) {
      ref.current.textContent = valor;
    }
  }, [valor]);
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
      <span className="font-bold text-[#2c4a70] text-sm min-w-[220px] flex-shrink-0">
        {label}:
      </span>
      <div
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.textContent || '')}
        className={`flex-1 px-2 py-1 text-sm border-b border-dashed border-gray-300 focus:border-[#4674e8] focus:outline-none bg-transparent whitespace-pre-wrap break-words print:border-none print:p-0 ${
          readOnly ? 'cursor-default' : ''
        }`}
        style={{ wordBreak: 'break-word', minHeight: '1.5em' }}
      />
    </div>
  );
}

/**
 * Campo de texto longo SEM barra de rolagem — usa contentEditable.
 * Cresce naturalmente conforme conteúdo, preserva quebras de linha.
 * No print, vira texto contínuo sem qualquer borda.
 */
function CampoLongo({
  valor,
  onChange,
  placeholder,
  readOnly,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== valor) {
      ref.current.textContent = valor;
    }
  }, [valor]);

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={(e) => onChange(e.currentTarget.textContent || '')}
      className={`campo-longo px-4 py-3 text-[15px] leading-7 border border-dashed border-gray-300 rounded-lg focus:border-[#4674e8] focus:outline-none bg-transparent min-h-[80px] whitespace-pre-wrap break-words print:border-none print:p-0 print:min-h-0 ${
        readOnly ? 'cursor-default' : ''
      }`}
      style={{ wordBreak: 'break-word' }}
    />
  );
}
