'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  FileText,
  Calendar,
  Building2,
  DollarSign,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { criarLicitacao } from '@/lib/services/licitacoes';
import { criarEvento } from '@/lib/services/eventos';
import { isConlicitacaoConfigurado, buscarEdital, buscarEditalPorUrl } from '@/lib/services/conlicitacao';

export default function NovaLicitacaoPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  const [numeroEdital, setNumeroEdital] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [dadosLicitacao, setDadosLicitacao] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [etapas, setEtapas] = useState({
    coleta: 'pendente',
    analise: 'pendente',
    certidoes: 'pendente',
    agenda: 'pendente'
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleBuscar = async () => {
    if (!numeroEdital.trim()) {
      setErro('Digite o número do edital');
      return;
    }

    setErro('');
    setBuscando(true);
    setDadosLicitacao(null);

    try {
      if (isConlicitacaoConfigurado()) {
        // Integração real com Conlicitação
        setEtapas({ coleta: 'processando', analise: 'pendente', certidoes: 'pendente', agenda: 'pendente' });

        const isUrl = numeroEdital.startsWith('http');
        const dados = isUrl
          ? await buscarEditalPorUrl(numeroEdital)
          : await buscarEdital(numeroEdital);

        setEtapas({ coleta: 'concluido', analise: 'processando', certidoes: 'pendente', agenda: 'pendente' });

        // Análise (resumo IA será adicionado futuramente)
        await new Promise((resolve) => setTimeout(resolve, 500));
        setEtapas({ coleta: 'concluido', analise: 'concluido', certidoes: 'processando', agenda: 'pendente' });

        await new Promise((resolve) => setTimeout(resolve, 500));
        setEtapas({ coleta: 'concluido', analise: 'concluido', certidoes: 'concluido', agenda: 'processando' });

        await new Promise((resolve) => setTimeout(resolve, 500));
        setEtapas({ coleta: 'concluido', analise: 'concluido', certidoes: 'concluido', agenda: 'concluido' });

        setDadosLicitacao({
          numero: dados.numero,
          objeto: dados.objeto,
          orgao: dados.orgao,
          modalidade: dados.modalidade,
          valor: dados.valorEstimado,
          dataCertame: dados.dataCertame,
          horaCertame: dados.horaCertame,
          prazoEntrega: dados.prazoEntrega,
          localEntrega: dados.localEntrega,
          urlConlicitacao: isUrl ? numeroEdital : undefined,
          resumo: `Licitação ${dados.modalidade} - ${dados.orgao}. Objeto: ${dados.objeto}.`,
          certidoesStatus: {
            cnd_federal: 'pendente',
            fgts: 'pendente',
            cndt: 'pendente',
            estadual: 'pendente',
            municipal: 'pendente'
          }
        });
      } else {
        // API não configurada - modo manual
        setErro('API do Conlicitação não configurada. Preencha os dados manualmente ou configure o token nas variáveis de ambiente.');
      }
    } catch (error: any) {
      setErro(error.message || 'Erro ao buscar dados da licitação');
      setEtapas({ coleta: 'pendente', analise: 'pendente', certidoes: 'pendente', agenda: 'pendente' });
    } finally {
      setBuscando(false);
    }
  };

  const handleSalvar = async () => {
    if (!dadosLicitacao || !userProfile?.clientId || !user) return;

    setSalvando(true);
    try {
      const licitacaoId = await criarLicitacao({
        numero: dadosLicitacao.numero,
        objeto: dadosLicitacao.objeto,
        orgao: dadosLicitacao.orgao,
        modalidade: dadosLicitacao.modalidade,
        valorEstimado: dadosLicitacao.valor,
        dataCertame: Timestamp.fromDate(new Date(dadosLicitacao.dataCertame)),
        horaCertame: dadosLicitacao.horaCertame,
        prazoEntrega: dadosLicitacao.prazoEntrega,
        localEntrega: dadosLicitacao.localEntrega || '',
        status: 'em_analise',
        resumoIA: dadosLicitacao.resumo || '',
        urlConlicitacao: dadosLicitacao.urlConlicitacao || '',
        clientId: userProfile.clientId,
        criadoPor: user.uid,
      });

      // Criar evento de sessão pública automaticamente
      if (dadosLicitacao.dataCertame && dadosLicitacao.horaCertame) {
        const [hora, minuto] = dadosLicitacao.horaCertame.split(':');
        const dataCertame = new Date(dadosLicitacao.dataCertame);
        dataCertame.setHours(parseInt(hora), parseInt(minuto));

        await criarEvento({
          titulo: `Sessão Pública - ${dadosLicitacao.numero}`,
          descricao: `${dadosLicitacao.modalidade} - ${dadosLicitacao.orgao}`,
          tipo: 'sessao_publica',
          dataHora: Timestamp.fromDate(dataCertame),
          licitacaoId,
          licitacaoNumero: dadosLicitacao.numero,
          urgente: false,
          concluido: false,
          clientId: userProfile.clientId,
          criadoPor: user.uid,
        });
      }

      router.push('/licitacoes');
    } catch (error: any) {
      setErro(error.message || 'Erro ao salvar licitação');
    } finally {
      setSalvando(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  const getEtapaIcon = (status: string) => {
    switch (status) {
      case 'processando':
        return <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />;
      case 'concluido':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-300" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/licitacoes"
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#1a2b45]" />
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Nova Licitação</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Busque e processe uma nova licitação
              </p>
            </div>
          </div>

          {/* Busca */}
          <div className="card p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Buscar Licitação</h2>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#1a2b45] mb-2">
                  Número do Edital / Código PNCP / URL Conlicitação
                </label>
                <input
                  type="text"
                  value={numeroEdital}
                  onChange={(e) => setNumeroEdital(e.target.value)}
                  placeholder="Ex: 65/2025 ou cole o link completo"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 transition-all"
                  disabled={buscando}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                />
              </div>
              <div className="sm:self-end">
                <button
                  onClick={handleBuscar}
                  disabled={buscando}
                  className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-3 px-6"
                >
                  {buscando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Buscar e Processar
                    </>
                  )}
                </button>
              </div>
            </div>

            {!isConlicitacaoConfigurado() && (
              <div className="mt-4 flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                API do Conlicitação não configurada. Configure o token para busca automática.
              </div>
            )}

            {erro && (
              <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {erro}
              </div>
            )}
          </div>

          {/* Etapas de Processamento */}
          {(buscando || dadosLicitacao) && (
            <div className="card p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Processamento</h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg border-2 transition-all ${etapas.coleta === 'concluido' ? 'border-green-200 bg-green-50' : etapas.coleta === 'processando' ? 'border-[#4674e8] bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getEtapaIcon(etapas.coleta)}
                    <span className="font-bold text-sm text-[#1a2b45]">Coleta</span>
                  </div>
                  <p className="text-xs text-[#1a2b45]/60">Dados do edital</p>
                </div>

                <div className={`p-4 rounded-lg border-2 transition-all ${etapas.analise === 'concluido' ? 'border-green-200 bg-green-50' : etapas.analise === 'processando' ? 'border-[#4674e8] bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getEtapaIcon(etapas.analise)}
                    <span className="font-bold text-sm text-[#1a2b45]">Análise</span>
                  </div>
                  <p className="text-xs text-[#1a2b45]/60">Resumo gerado</p>
                </div>

                <div className={`p-4 rounded-lg border-2 transition-all ${etapas.certidoes === 'concluido' ? 'border-green-200 bg-green-50' : etapas.certidoes === 'processando' ? 'border-[#4674e8] bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getEtapaIcon(etapas.certidoes)}
                    <span className="font-bold text-sm text-[#1a2b45]">Certidões</span>
                  </div>
                  <p className="text-xs text-[#1a2b45]/60">Verificadas</p>
                </div>

                <div className={`p-4 rounded-lg border-2 transition-all ${etapas.agenda === 'concluido' ? 'border-green-200 bg-green-50' : etapas.agenda === 'processando' ? 'border-[#4674e8] bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getEtapaIcon(etapas.agenda)}
                    <span className="font-bold text-sm text-[#1a2b45]">Agenda</span>
                  </div>
                  <p className="text-xs text-[#1a2b45]/60">Eventos criados</p>
                </div>
              </div>
            </div>
          )}

          {/* Dados da Licitação */}
          {dadosLicitacao && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="card p-4 sm:p-6">
                <h2 className="text-lg font-bold text-[#2c4a70] mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#4674e8]" />
                  Dados da Licitação
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1">Número</label>
                    <p className="font-bold text-[#2c4a70]">{dadosLicitacao.numero}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1">Modalidade</label>
                    <p className="font-bold text-[#2c4a70]">{dadosLicitacao.modalidade}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-[#1a2b45]/60 mb-1">Objeto</label>
                    <p className="text-[#1a2b45]">{dadosLicitacao.objeto}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1 flex items-center gap-1">
                      <Building2 className="w-4 h-4" /> Órgão
                    </label>
                    <p className="text-[#1a2b45]">{dadosLicitacao.orgao}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" /> Valor Estimado
                    </label>
                    <p className="font-bold text-[#2c4a70] text-lg">
                      {dadosLicitacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> Data do Certame
                    </label>
                    <p className="text-[#1a2b45]">
                      {new Date(dadosLicitacao.dataCertame).toLocaleDateString('pt-BR')} às {dadosLicitacao.horaCertame}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1">Prazo de Entrega</label>
                    <p className="text-[#1a2b45]">{dadosLicitacao.prazoEntrega}</p>
                  </div>
                </div>

                {dadosLicitacao.resumo && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-sm text-[#1a2b45]/60 mb-2">Resumo (gerado por IA)</label>
                    <p className="text-sm text-[#1a2b45] bg-gray-50 p-4 rounded-lg">
                      {dadosLicitacao.resumo}
                    </p>
                  </div>
                )}
              </div>

              {/* Status das Certidões */}
              {dadosLicitacao.certidoesStatus && (
                <div className="card p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Status das Certidões</h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Object.entries(dadosLicitacao.certidoesStatus).map(([key, status]) => (
                      <div
                        key={key}
                        className={`p-3 rounded-lg text-center ${
                          status === 'valida' ? 'bg-green-50' :
                          status === 'vencendo' ? 'bg-amber-50' :
                          'bg-red-50'
                        }`}
                      >
                        <p className="text-xs font-bold text-[#1a2b45] uppercase mb-1">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <span className={`text-xs font-bold ${
                          status === 'valida' ? 'text-green-600' :
                          status === 'vencendo' ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {status === 'valida' ? 'Válida' :
                           status === 'vencendo' ? 'Vencendo' :
                           'Pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <Link
                  href="/licitacoes"
                  className="btn-secondary text-center"
                >
                  Cancelar
                </Link>
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Salvar Licitação
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
