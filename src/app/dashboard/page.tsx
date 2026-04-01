'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Package,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Plus,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { listarLicitacoes } from '@/lib/services/licitacoes';
import { listarEventosProximos } from '@/lib/services/eventos';
import { Licitacao, Evento, LicitacaoStatus } from '@/lib/types';

const statusLabels: Record<string, { label: string; class: string }> = {
  em_analise: { label: 'Em Análise', class: 'badge-info' },
  aguardando_certame: { label: 'Aguard. Certame', class: 'badge-warning' },
  aguardando_entrega: { label: 'Aguard. Entrega', class: 'badge-warning' },
  aguardando_pagamento: { label: 'Aguard. Pagamento', class: 'badge-info' },
  concluida: { label: 'Concluída', class: 'badge-success' },
  cancelada: { label: 'Cancelada', class: 'badge-danger' },
};

function formatarDataEvento(data: Date): string {
  const agora = new Date();
  const diff = Math.ceil((data.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (diff <= 0) return `Hoje, ${hora}`;
  if (diff === 1) return `Amanhã, ${hora}`;
  return `Em ${diff} dias`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile?.clientId) {
        setCarregando(false);
        return;
      }
      try {
        const [lics, evts] = await Promise.all([
          listarLicitacoes(userProfile.clientId),
          listarEventosProximos(userProfile.clientId, 30),
        ]);
        setLicitacoes(lics);
        setEventos(evts);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (userProfile) carregar();
  }, [userProfile]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  // Calcular estatísticas a partir dos dados reais
  const contarStatus = (status: LicitacaoStatus) =>
    licitacoes.filter((l) => l.status === status).length;

  const stats = [
    {
      name: 'Em Análise',
      value: contarStatus('em_analise'),
      icon: FileText,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      name: 'Aguard. Entrega',
      value: contarStatus('aguardando_entrega'),
      icon: Package,
      color: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    {
      name: 'Aguard. Pagamento',
      value: contarStatus('aguardando_pagamento'),
      icon: DollarSign,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
    {
      name: 'Concluídas',
      value: contarStatus('concluida'),
      icon: CheckCircle,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-700',
    },
  ];

  const licitacoesRecentes = licitacoes.slice(0, 5);
  const proximosEventos = eventos.filter((e) => !e.concluido).slice(0, 5);

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Dashboard</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Bem-vindo, <span className="font-bold">{userProfile?.name}</span>
              </p>
            </div>
            <Link
              href="/licitacoes/nova"
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Nova Licitação
            </Link>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center gap-3 py-20">
              <Loader2 className="w-6 h-6 text-[#4674e8] animate-spin" />
              <span className="text-[#1a2b45]/60">Carregando dados...</span>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.name} className="card p-3 sm:p-4 lg:p-6 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <div className="order-2 sm:order-1">
                          <p className="text-xs sm:text-sm text-[#1a2b45]/60 leading-tight">{stat.name}</p>
                          <p className="text-2xl lg:text-3xl font-bold text-[#2c4a70] mt-1">{stat.value}</p>
                        </div>
                        <div className={`order-1 sm:order-2 w-10 h-10 lg:w-12 lg:h-12 ${stat.bgLight} rounded-xl flex items-center justify-center self-end sm:self-auto`}>
                          <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.textColor}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                {/* Próximos Eventos */}
                <div className="xl:col-span-1 card p-4 lg:p-6 animate-slideIn">
                  <div className="flex items-center justify-between mb-4 lg:mb-6">
                    <h2 className="text-lg lg:text-xl font-bold text-[#2c4a70]">Próximos Eventos</h2>
                    <Calendar className="w-5 h-5 text-[#4674e8]" />
                  </div>
                  <div className="space-y-3 lg:space-y-4">
                    {proximosEventos.length === 0 ? (
                      <p className="text-sm text-[#1a2b45]/60 text-center py-4">
                        Nenhum evento próximo
                      </p>
                    ) : (
                      proximosEventos.map((evento) => {
                        const dataEvento = evento.dataHora.toDate();
                        const agora = new Date();
                        const diffDias = Math.ceil(
                          (dataEvento.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const urgente = evento.urgente || diffDias <= 1;

                        return (
                          <div
                            key={evento.id}
                            className={`p-3 lg:p-4 rounded-lg border-l-4 ${
                              urgente
                                ? 'bg-red-50 border-red-500'
                                : 'bg-gray-50 border-[#4674e8]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm lg:text-base text-[#1a2b45] leading-tight">
                                  {evento.titulo}
                                </p>
                                {evento.licitacaoNumero && (
                                  <p className="text-xs lg:text-sm text-[#1a2b45]/60 mt-1 truncate">
                                    Licitação #{evento.licitacaoNumero}
                                  </p>
                                )}
                              </div>
                              {urgente && (
                                <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs lg:text-sm font-medium text-[#4674e8] mt-2">
                              {formatarDataEvento(dataEvento)}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <Link
                    href="/agenda"
                    className="block text-center text-sm lg:text-base text-[#4674e8] font-medium mt-4 hover:text-[#2c4a70] transition-colors"
                  >
                    Ver agenda completa →
                  </Link>
                </div>

                {/* Licitações Recentes */}
                <div className="xl:col-span-2 card p-4 lg:p-6 animate-slideIn">
                  <div className="flex items-center justify-between mb-4 lg:mb-6">
                    <h2 className="text-lg lg:text-xl font-bold text-[#2c4a70]">Licitações Recentes</h2>
                    <TrendingUp className="w-5 h-5 text-[#4674e8]" />
                  </div>

                  {licitacoesRecentes.length === 0 ? (
                    <p className="text-sm text-[#1a2b45]/60 text-center py-8">
                      Nenhuma licitação cadastrada ainda.
                    </p>
                  ) : (
                    <>
                      {/* Mobile: Cards */}
                      <div className="block lg:hidden space-y-3">
                        {licitacoesRecentes.map((licitacao) => (
                          <div
                            key={licitacao.id}
                            className="p-3 rounded-lg bg-gray-50 border border-gray-100"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="font-bold text-[#2c4a70]">#{licitacao.numero}</span>
                              <span className={`badge text-xs ${statusLabels[licitacao.status]?.class || 'badge-info'}`}>
                                {statusLabels[licitacao.status]?.label || licitacao.status}
                              </span>
                            </div>
                            <p className="text-sm text-[#1a2b45] mb-1">{licitacao.objeto}</p>
                            <p className="text-xs text-[#1a2b45]/60 mb-2">{licitacao.orgao}</p>
                            <p className="font-bold text-[#2c4a70]">
                              {licitacao.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#d64b16]/20">
                              <th className="text-left py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Nº</th>
                              <th className="text-left py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Objeto</th>
                              <th className="text-left py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Órgão</th>
                              <th className="text-right py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Valor</th>
                              <th className="text-center py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {licitacoesRecentes.map((licitacao) => (
                              <tr
                                key={licitacao.id}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                <td className="py-4 px-4">
                                  <span className="font-bold text-[#2c4a70]">{licitacao.numero}</span>
                                </td>
                                <td className="py-4 px-4">
                                  <p className="text-[#1a2b45] truncate max-w-[200px]">{licitacao.objeto}</p>
                                </td>
                                <td className="py-4 px-4">
                                  <p className="text-[#1a2b45]/60 truncate max-w-[150px]">{licitacao.orgao}</p>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <span className="font-bold text-[#1a2b45]">
                                    {licitacao.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className={`badge ${statusLabels[licitacao.status]?.class || 'badge-info'}`}>
                                    {statusLabels[licitacao.status]?.label || licitacao.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  <Link
                    href="/licitacoes"
                    className="block text-center text-sm lg:text-base text-[#4674e8] font-medium mt-4 hover:text-[#2c4a70] transition-colors"
                  >
                    Ver todas as licitações →
                  </Link>
                </div>
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
