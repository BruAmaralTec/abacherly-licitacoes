'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  Save,
  Loader2,
  FileText,
  Download,
  FileDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { buscarLicitacao, atualizarLicitacao } from '@/lib/services/licitacoes';
import { exportarAnaliseWord } from '@/lib/services/exportarWord';
import { Licitacao, AnaliseEdital } from '@/lib/types';

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
  const [menuExportar, setMenuExportar] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
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
        setAnalise(dados.analise || {});
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
      await exportarAnaliseWord(licitacao, analise);
    } catch (error) {
      console.error('Erro ao exportar Word:', error);
    } finally {
      setExportando(false);
    }
  };

  const updateAnalise = (campo: keyof AnaliseEdital, valor: string) => {
    setAnalise((prev) => ({ ...prev, [campo]: valor }));
    setSalvo(false);
  };

  if (loading || !user || carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!licitacao) return null;

  const dataCertame = licitacao.dataCertame?.toDate();
  const dataCertameStr = dataCertame
    ? `${dataCertame.toLocaleDateString('pt-BR')} ${licitacao.horaCertame || dataCertame.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="w-full lg:pl-64 print:pl-0 min-h-screen flex flex-col">
        {/* Toolbar - não aparece na impressão */}
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
                <p className="text-xs text-[#1a2b45]/60">#{licitacao.numero} - {licitacao.orgao}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {salvo && (
                <span className="text-sm text-green-600 font-medium">Salvo!</span>
              )}
              {!isCliente && (
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              )}
              <button
                onClick={handleExportarWord}
                disabled={exportando}
                className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
              >
                {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
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

        {/* Documento */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 print:p-0">
          <div
            ref={printRef}
            className="max-w-[800px] mx-auto bg-white shadow-lg print:shadow-none rounded-lg print:rounded-none"
          >
            {/* Conteúdo do documento */}
            <div className="p-8 sm:p-12 print:p-[2cm] space-y-6 text-[#1a2b45] text-sm leading-relaxed">

              {/* Cabeçalho */}
              <div className="text-center border-b-2 border-[#d64b16] pb-6">
                <h1 className="text-2xl font-bold text-[#2c4a70] tracking-wide">ANÁLISE DO EDITAL</h1>
                <p className="text-base text-[#1a2b45]/80 mt-2">
                  Nº Conlicitação <span className="font-bold">{licitacao.numeroControlePNCP || licitacao.codigoPNCP || '—'}</span>
                </p>
              </div>

              {/* Título do Edital */}
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

              {/* Resumo - Condições */}
              <div>
                <h2 className="text-base font-bold text-[#2c4a70] border-b border-[#d64b16]/30 pb-2 mb-4">
                  RESUMO - CONDIÇÕES DE PARTICIPAÇÃO E FORNECIMENTO
                </h2>

                <div className="space-y-3">
                  <Campo label="Objeto" valor={licitacao.objeto} />
                  <Campo label="Órgão" valor={licitacao.orgao} />
                  <Campo label="Data do Certame" valor={dataCertameStr} />

                  <CampoEditavel
                    label="Fuso Horário"
                    valor={analise.fusoHorario || ''}
                    onChange={(v) => updateAnalise('fusoHorario', v)}
                    placeholder="Ex: Horário de Brasília"
                  />

                  <Campo label="Modalidade" valor={licitacao.modalidade} />

                  <CampoEditavel
                    label="Base Legal"
                    valor={analise.baseLegal || licitacao.baseLegal || ''}
                    onChange={(v) => updateAnalise('baseLegal', v)}
                    placeholder="Ex: Lei Federal nº 14.133/2021"
                  />

                  <CampoEditavel
                    label="Enquadramento da Empresa"
                    valor={analise.enquadramentoEmpresa || ''}
                    onChange={(v) => updateAnalise('enquadramentoEmpresa', v)}
                    placeholder="Ex: ME, EPP, Demais"
                  />

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Campo
                        label="Valor"
                        valor={licitacao.valorEstimado
                          ? licitacao.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : ''}
                      />
                    </div>
                    <div className="flex-1">
                      <CampoEditavel
                        label="Intervalo de Lance"
                        valor={analise.valorIntervaloLance || ''}
                        onChange={(v) => updateAnalise('valorIntervaloLance', v)}
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>

                  <CampoEditavel
                    label="Formalização"
                    valor={analise.formalizacao || (licitacao.srp ? 'Ata de Registro de Preços' : '')}
                    onChange={(v) => updateAnalise('formalizacao', v)}
                    placeholder="Ex: Ata de Registro de Preços, Contrato"
                  />

                  <CampoEditavel
                    label="Portal"
                    valor={analise.portal || ''}
                    onChange={(v) => updateAnalise('portal', v)}
                    placeholder="Ex: Licitanet, ComprasNet, BLL"
                  />

                  <CampoEditavel
                    label="Critério de Julgamento"
                    valor={analise.criterioJulgamento || ''}
                    onChange={(v) => updateAnalise('criterioJulgamento', v)}
                    placeholder="Ex: Menor Preço por Item"
                  />

                  <CampoEditavel
                    label="Modo de Disputa"
                    valor={analise.modoDisputa || licitacao.modoDisputa || ''}
                    onChange={(v) => updateAnalise('modoDisputa', v)}
                    placeholder="Ex: Aberto, Aberto-Fechado"
                  />

                  <CampoEditavel
                    label="Data Limite Cadastramento"
                    valor={analise.dataLimiteCadastramento || ''}
                    onChange={(v) => updateAnalise('dataLimiteCadastramento', v)}
                    placeholder=""
                  />

                  <Campo label="Prazo de Entrega" valor={licitacao.prazoEntrega} />

                  <CampoEditavel
                    label="Garantia de Contrato"
                    valor={analise.garantiaContrato || ''}
                    onChange={(v) => updateAnalise('garantiaContrato', v)}
                    placeholder=""
                  />

                  <CampoEditavel
                    label="Validade da Proposta"
                    valor={analise.validadeProposta || ''}
                    onChange={(v) => updateAnalise('validadeProposta', v)}
                    placeholder="Ex: 60 dias"
                  />

                  <CampoEditavel
                    label="Vigência Total Contrato"
                    valor={analise.vigenciaTotalContrato || ''}
                    onChange={(v) => updateAnalise('vigenciaTotalContrato', v)}
                    placeholder=""
                  />

                  <CampoEditavel
                    label="Pagamento"
                    valor={analise.pagamento || ''}
                    onChange={(v) => updateAnalise('pagamento', v)}
                    placeholder=""
                  />

                  <CampoEditavel
                    label="Recurso"
                    valor={analise.recurso || ''}
                    onChange={(v) => updateAnalise('recurso', v)}
                    placeholder=""
                  />

                  <CampoEditavel
                    label="Proposta Adequada e documentos de Habilitação"
                    valor={analise.propostaAdequada || ''}
                    onChange={(v) => updateAnalise('propostaAdequada', v)}
                    placeholder=""
                    multiline
                  />

                  <CampoEditavel
                    label="Assinatura do Contrato"
                    valor={analise.assinaturaContrato || ''}
                    onChange={(v) => updateAnalise('assinaturaContrato', v)}
                    placeholder=""
                  />
                </div>
              </div>

              {/* Seções detalhadas */}
              <SecaoEditavel
                titulo="DOCUMENTAÇÃO"
                valor={analise.documentacao || ''}
                onChange={(v) => updateAnalise('documentacao', v)}
                placeholder="Detalhes sobre a documentação exigida..."
              />

              <SecaoEditavel
                titulo="GARANTIA DE CONTRATO"
                valor={analise.garantiaContratoDetalhe || ''}
                onChange={(v) => updateAnalise('garantiaContratoDetalhe', v)}
                placeholder="Detalhes sobre garantia contratual..."
              />

              <SecaoEditavel
                titulo="PROPOSTA"
                valor={analise.proposta || ''}
                onChange={(v) => updateAnalise('proposta', v)}
                placeholder="Requisitos da proposta..."
              />

              <SecaoEditavel
                titulo="PROPOSTA REVISADA"
                valor={analise.propostaRevisada || ''}
                onChange={(v) => updateAnalise('propostaRevisada', v)}
                placeholder="Condições para proposta revisada..."
              />

              <SecaoEditavel
                titulo="HABILITAÇÃO JURÍDICA"
                valor={analise.habilitacaoJuridica || ''}
                onChange={(v) => updateAnalise('habilitacaoJuridica', v)}
                placeholder="Documentos de habilitação jurídica..."
              />

              <SecaoEditavel
                titulo="REGULARIDADE FISCAL E TRABALHISTA"
                valor={analise.regularidadeFiscal || ''}
                onChange={(v) => updateAnalise('regularidadeFiscal', v)}
                placeholder="Documentos de regularidade fiscal e trabalhista..."
              />

              <SecaoEditavel
                titulo="QUALIFICAÇÃO ECONÔMICA FINANCEIRA"
                valor={analise.qualificacaoEconomica || ''}
                onChange={(v) => updateAnalise('qualificacaoEconomica', v)}
                placeholder="Requisitos de qualificação econômico-financeira..."
              />

              <SecaoEditavel
                titulo="QUALIFICAÇÃO TÉCNICA"
                valor={analise.qualificacaoTecnica || ''}
                onChange={(v) => updateAnalise('qualificacaoTecnica', v)}
                placeholder="Requisitos de qualificação técnica..."
              />

              <SecaoEditavel
                titulo="DECLARAÇÕES"
                valor={analise.declaracoes || ''}
                onChange={(v) => updateAnalise('declaracoes', v)}
                placeholder="Declarações exigidas..."
              />

              <SecaoEditavel
                titulo="JULGAMENTO DA PROPOSTA"
                valor={analise.julgamentoProposta || ''}
                onChange={(v) => updateAnalise('julgamentoProposta', v)}
                placeholder="Critérios de julgamento..."
              />

              <SecaoEditavel
                titulo="DECLARADO VENCEDOR / ASSINATURA DO CONTRATO"
                valor={analise.declaradoVencedor || ''}
                onChange={(v) => updateAnalise('declaradoVencedor', v)}
                placeholder="Procedimentos após declaração do vencedor..."
              />

              <SecaoEditavel
                titulo="DO FATURAMENTO / ENTREGA DO SERVIÇO"
                valor={analise.faturamentoEntrega || ''}
                onChange={(v) => updateAnalise('faturamentoEntrega', v)}
                placeholder="Condições de faturamento e entrega..."
              />

              {/* Rodapé */}
              <div className="border-t-2 border-[#d64b16] pt-6 mt-8">
                <p className="text-xs text-[#1a2b45]/60 italic">
                  Em caso de dúvidas consultar o edital e seus anexos, este resumo não exime a leitura total dos documentos oficiais da presente licitação.
                </p>
                <div className="mt-6 text-center">
                  <p className="text-sm text-[#1a2b45]/80">
                    Itu, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
    </div>
  );
}

// ==================== COMPONENTES AUXILIARES ====================

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
      <span className="font-bold text-[#2c4a70] text-sm min-w-[200px] flex-shrink-0">{label}:</span>
      <span className="text-[#1a2b45] print:text-black">{valor || '—'}</span>
    </div>
  );
}

function CampoEditavel({
  label,
  valor,
  onChange,
  placeholder,
  multiline = false,
  readOnly = false,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
      <span className="font-bold text-[#2c4a70] text-sm min-w-[200px] flex-shrink-0">{label}:</span>
      <div className="flex-1">
        {multiline ? (
          <textarea
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={2}
            readOnly={readOnly}
            className={`w-full px-2 py-1 text-sm border-b border-dashed border-gray-300 focus:border-[#4674e8] focus:outline-none bg-transparent resize-none print:border-none print:p-0 ${readOnly ? 'cursor-default' : ''}`}
          />
        ) : (
          <input
            type="text"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`w-full px-2 py-1 text-sm border-b border-dashed border-gray-300 focus:border-[#4674e8] focus:outline-none bg-transparent print:border-none print:p-0 ${readOnly ? 'cursor-default' : ''}`}
          />
        )}
      </div>
    </div>
  );
}

function SecaoEditavel({
  titulo,
  valor,
  onChange,
  placeholder,
  readOnly = false,
}: {
  titulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <h2 className="text-base font-bold text-[#2c4a70] border-b border-[#d64b16]/30 pb-2 mb-3">
        {titulo}
      </h2>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        readOnly={readOnly}
        className={`w-full px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg focus:border-[#4674e8] focus:outline-none bg-transparent resize-y min-h-[60px] print:border-none print:p-0 print:min-h-0 ${readOnly ? 'cursor-default' : ''}`}
      />
    </div>
  );
}
