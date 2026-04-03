'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Search
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import {
  criarSolicitacao,
  listarSolicitacoesPorCliente,
} from '@/lib/services/solicitacoes';
import { Solicitacao, SOLICITACAO_STATUS_LABELS } from '@/lib/types';

export default function SolicitacoesPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [numeroConlicitacao, setNumeroConlicitacao] = useState('');
  const [uasg, setUasg] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile?.clientId) return;
      try {
        const dados = await listarSolicitacoesPorCliente(userProfile.clientId);
        setSolicitacoes(dados);
      } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (!loading && userProfile) carregar();
  }, [loading, userProfile]);

  const handleSolicitar = async () => {
    if (!numeroConlicitacao.trim()) {
      setErro('Digite o número do Conlicitação');
      return;
    }
    if (!userProfile?.clientId || !user) return;

    setErro('');
    setSucesso('');
    setEnviando(true);

    try {
      await criarSolicitacao({
        numeroConlicitacao: numeroConlicitacao.trim(),
        uasg: uasg.trim() || undefined,
        clientId: userProfile.clientId,
        clientNome: userProfile.name,
        status: 'pendente',
        observacoesCliente: observacoes.trim() || undefined,
        criadoPor: user.uid,
      });

      setSucesso('Solicitação enviada com sucesso!');
      setNumeroConlicitacao('');
      setUasg('');
      setObservacoes('');

      // Recarregar lista
      const dados = await listarSolicitacoesPorCliente(userProfile.clientId);
      setSolicitacoes(dados);
    } catch (error: any) {
      setErro(error.message || 'Erro ao enviar solicitação');
    } finally {
      setEnviando(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { cor: string; icon: React.ReactNode }> = {
      pendente: { cor: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
      em_analise: { cor: 'bg-blue-100 text-blue-700', icon: <Search className="w-3 h-3" /> },
      concluida: { cor: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
      recusada: { cor: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
    };
    const c = config[status] || config.pendente;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.cor}`}>
        {c.icon}
        {SOLICITACAO_STATUS_LABELS[status as keyof typeof SOLICITACAO_STATUS_LABELS] || status}
      </span>
    );
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length;
  const emAnalise = solicitacoes.filter((s) => s.status === 'em_analise').length;
  const concluidas = solicitacoes.filter((s) => s.status === 'concluida').length;

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Solicitar Análise</h1>
            <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
              Envie números do Conlicitação para análise pela Abacherly
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{pendentes}</p>
              <p className="text-xs text-[#1a2b45]/60">Pendentes</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{emAnalise}</p>
              <p className="text-xs text-[#1a2b45]/60">Em Análise</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{concluidas}</p>
              <p className="text-xs text-[#1a2b45]/60">Concluídas</p>
            </div>
          </div>

          {/* Formulário */}
          <div className="card p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-bold text-[#2c4a70] mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#4674e8]" />
              Nova Solicitação
            </h2>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#1a2b45] mb-2">
                    Número do Conlicitação *
                  </label>
                  <input
                    type="text"
                    value={numeroConlicitacao}
                    onChange={(e) => setNumeroConlicitacao(e.target.value)}
                    placeholder="Ex: 17332910"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 transition-all"
                    disabled={enviando}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-[#1a2b45] mb-2">
                    UASG (opcional)
                  </label>
                  <input
                    type="text"
                    value={uasg}
                    onChange={(e) => setUasg(e.target.value)}
                    placeholder="Ex: 160199"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 transition-all"
                    disabled={enviando}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais sobre a licitação..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 transition-all resize-none"
                  disabled={enviando}
                />
              </div>

              <button
                onClick={handleSolicitar}
                disabled={enviando}
                className="btn-primary flex items-center justify-center gap-2 py-3 px-6"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-5 h-5" />
                    Solicitar Análise
                  </>
                )}
              </button>

              {erro && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {erro}
                </div>
              )}
              {sucesso && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  {sucesso}
                </div>
              )}
            </div>
          </div>

          {/* Lista de Solicitações */}
          <div className="card p-4 sm:p-6">
            <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Minhas Solicitações</h2>

            {carregando ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#4674e8]" />
              </div>
            ) : solicitacoes.length === 0 ? (
              <p className="text-center text-[#1a2b45]/60 py-8">
                Nenhuma solicitação enviada ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {solicitacoes.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-[#2c4a70]">
                            #{s.numeroConlicitacao}
                          </span>
                          {s.uasg && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-[#1a2b45]/60">
                              UASG: {s.uasg}
                            </span>
                          )}
                          {getStatusBadge(s.status)}
                        </div>
                        {s.observacoesCliente && (
                          <p className="text-sm text-[#1a2b45]/70 mt-1">{s.observacoesCliente}</p>
                        )}
                        {s.observacoesAdmin && (
                          <p className="text-sm text-[#1a2b45]/70 mt-1 italic">
                            Resposta: {s.observacoesAdmin}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-[#1a2b45]/60">
                          {s.criadoEm?.toDate?.()
                            ? s.criadoEm.toDate().toLocaleDateString('pt-BR')
                            : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
