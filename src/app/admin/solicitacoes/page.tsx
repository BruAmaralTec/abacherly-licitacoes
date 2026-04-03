'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutList,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import {
  listarTodasSolicitacoes,
  recusarSolicitacao,
  atualizarSolicitacao,
} from '@/lib/services/solicitacoes';
import { Solicitacao, SolicitacaoStatus, SOLICITACAO_STATUS_LABELS } from '@/lib/types';

export default function AdminSolicitacoesPage() {
  const router = useRouter();
  const { user, userProfile, loading, isAdmin } = useAuth();

  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<SolicitacaoStatus | ''>('');
  const [clientesAbertos, setClientesAbertos] = useState<Set<string>>(new Set());
  const [modalRecusa, setModalRecusa] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdmin) router.push('/dashboard');
  }, [user, loading, router, isAdmin]);

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await listarTodasSolicitacoes(filtroStatus || undefined);
        setSolicitacoes(dados);

        // Abrir todos os clientes por padrão
        const clientes = new Set(dados.map((s) => s.clientId));
        setClientesAbertos(clientes);
      } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (!loading && isAdmin) carregar();
  }, [loading, isAdmin, filtroStatus]);

  const toggleCliente = (clientId: string) => {
    setClientesAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const handleProcessar = async (s: Solicitacao) => {
    if (!s.id || !user) return;
    await atualizarSolicitacao(s.id, { status: 'em_analise', processadoPor: user.uid });
    const params = new URLSearchParams({
      numero: s.numeroConlicitacao,
      solicitacaoId: s.id,
    });
    if (s.uasg) params.set('uasg', s.uasg);
    router.push(`/licitacoes/nova?${params.toString()}`);
  };

  const handleRecusar = async () => {
    if (!modalRecusa || !user || !motivoRecusa.trim()) return;
    await recusarSolicitacao(modalRecusa, user.uid, motivoRecusa.trim());
    setSolicitacoes((prev) =>
      prev.map((s) =>
        s.id === modalRecusa
          ? { ...s, status: 'recusada' as SolicitacaoStatus, observacoesAdmin: motivoRecusa.trim() }
          : s
      )
    );
    setModalRecusa(null);
    setMotivoRecusa('');
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

  // Agrupar por cliente
  const agrupado = solicitacoes.reduce(
    (acc, s) => {
      const key = s.clientId;
      if (!acc[key]) acc[key] = { clientNome: s.clientNome || s.clientId, itens: [] };
      acc[key].itens.push(s);
      return acc;
    },
    {} as Record<string, { clientNome: string; itens: Solicitacao[] }>
  );

  const pendentesTotal = solicitacoes.filter((s) => s.status === 'pendente').length;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">
              Painel de Solicitações
            </h1>
            <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
              {pendentesTotal} solicitaç{pendentesTotal === 1 ? 'ão pendente' : 'ões pendentes'} de análise
            </p>
          </div>

          {/* Filtro por status */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['', 'pendente', 'em_analise', 'concluida', 'recusada'].map((s) => (
              <button
                key={s}
                onClick={() => { setFiltroStatus(s as SolicitacaoStatus | ''); setCarregando(true); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroStatus === s
                    ? 'bg-[#4674e8] text-white'
                    : 'bg-white text-[#1a2b45]/70 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {s === '' ? 'Todas' : SOLICITACAO_STATUS_LABELS[s as SolicitacaoStatus]}
              </button>
            ))}
          </div>

          {/* Lista agrupada por cliente */}
          {carregando ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#4674e8]" />
            </div>
          ) : Object.keys(agrupado).length === 0 ? (
            <div className="card p-8 text-center text-[#1a2b45]/60">
              Nenhuma solicitação encontrada.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(agrupado).map(([clientId, { clientNome, itens }]) => {
                const pendentes = itens.filter((s) => s.status === 'pendente').length;
                return (
                  <div key={clientId} className="card overflow-hidden">
                    <button
                      onClick={() => toggleCliente(clientId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {clientesAbertos.has(clientId) ? (
                          <ChevronDown className="w-5 h-5 text-[#4674e8]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[#1a2b45]/40" />
                        )}
                        <h3 className="font-bold text-[#2c4a70]">{clientNome}</h3>
                        <span className="text-sm text-[#1a2b45]/60">
                          ({itens.length} solicitaç{itens.length === 1 ? 'ão' : 'ões'})
                        </span>
                        {pendentes > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            {pendentes} pendente{pendentes > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>

                    {clientesAbertos.has(clientId) && (
                      <div className="border-t border-gray-100 divide-y divide-gray-100">
                        {itens.map((s) => (
                          <div key={s.id} className="p-4 hover:bg-gray-50/50">
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
                                  <p className="text-sm text-[#1a2b45]/70">{s.observacoesCliente}</p>
                                )}
                                {s.observacoesAdmin && (
                                  <p className="text-sm text-[#1a2b45]/70 italic">
                                    Resposta: {s.observacoesAdmin}
                                  </p>
                                )}
                                <p className="text-xs text-[#1a2b45]/40 mt-1">
                                  {s.criadoEm?.toDate?.()
                                    ? s.criadoEm.toDate().toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {s.status === 'pendente' && (
                                  <>
                                    <button
                                      onClick={() => handleProcessar(s)}
                                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#4674e8] text-white hover:bg-[#3a63d0] transition-colors"
                                    >
                                      Processar
                                    </button>
                                    <button
                                      onClick={() => setModalRecusa(s.id || null)}
                                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    >
                                      Recusar
                                    </button>
                                  </>
                                )}
                                {s.status === 'concluida' && s.licitacaoId && (
                                  <Link
                                    href={`/licitacoes/${s.licitacaoId}/analise`}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Ver Análise
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <Footer />
      </div>

      {/* Modal de Recusa */}
      {modalRecusa && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[#2c4a70] mb-4">Recusar Solicitação</h3>
            <textarea
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              placeholder="Motivo da recusa..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setModalRecusa(null); setMotivoRecusa(''); }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleRecusar}
                disabled={!motivoRecusa.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
