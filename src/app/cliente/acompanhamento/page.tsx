'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  FileText,
  Upload,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { PageSkeleton } from '@/components/Skeleton';
import { listarLicitacoes } from '@/lib/services/licitacoes';
import { listarDocumentosPorCliente } from '@/lib/services/documentos';
import { listarSolicitacoesPorCliente } from '@/lib/services/solicitacoes';
import {
  Licitacao,
  Documento,
  Solicitacao,
  STATUS_LABELS,
  DOCUMENTO_STATUS_LABELS,
  SOLICITACAO_STATUS_LABELS,
} from '@/lib/types';

type Periodo = 'semana' | 'mes' | 'ano' | 'tudo' | 'custom';

export default function AcompanhamentoClientePage() {
  const router = useRouter();
  const { user, userProfile, loading, isCliente } = useAuth();
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && userProfile && !isCliente) router.push('/dashboard');
  }, [user, userProfile, loading, isCliente, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile?.clientId) {
        setCarregando(false);
        return;
      }
      try {
        const [lics, docs, sols] = await Promise.all([
          listarLicitacoes(userProfile.clientId),
          listarDocumentosPorCliente(userProfile.clientId),
          listarSolicitacoesPorCliente(userProfile.clientId),
        ]);
        setLicitacoes(lics);
        setDocumentos(docs);
        setSolicitacoes(sols);
      } catch (e) {
        console.error('Erro carregando acompanhamento:', e);
      } finally {
        setCarregando(false);
      }
    }
    if (userProfile) carregar();
  }, [userProfile]);

  // Calcula intervalo do filtro
  const intervalo = useMemo(() => {
    const agora = new Date();
    let inicio: Date | null = null;
    let fim: Date | null = null;

    if (periodo === 'semana') {
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 7);
    } else if (periodo === 'mes') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    } else if (periodo === 'ano') {
      inicio = new Date(agora.getFullYear(), 0, 1);
    } else if (periodo === 'custom') {
      if (dataInicial) inicio = new Date(dataInicial);
      if (dataFinal) {
        fim = new Date(dataFinal);
        fim.setHours(23, 59, 59, 999);
      }
    }
    return { inicio, fim };
  }, [periodo, dataInicial, dataFinal]);

  function dentroDoIntervalo(dt: Date): boolean {
    const { inicio, fim } = intervalo;
    if (inicio && dt < inicio) return false;
    if (fim && dt > fim) return false;
    return true;
  }

  const licitacoesFiltradas = useMemo(
    () => licitacoes.filter((l) => dentroDoIntervalo(l.criadoEm?.toDate?.() ?? new Date())),
    [licitacoes, intervalo]
  );

  const documentosFiltrados = useMemo(
    () => documentos.filter((d) => dentroDoIntervalo(d.criadoEm?.toDate?.() ?? new Date())),
    [documentos, intervalo]
  );

  const solicitacoesFiltradas = useMemo(
    () => solicitacoes.filter((s) => dentroDoIntervalo(s.criadoEm?.toDate?.() ?? new Date())),
    [solicitacoes, intervalo]
  );

  // KPIs
  const totalDocsEnviados = documentosFiltrados.length;
  const totalDocsValidados = documentosFiltrados.filter((d) => d.status === 'validado').length;
  const totalDocsRecusados = documentosFiltrados.filter((d) => d.status === 'recusado').length;
  const totalAnalisesAndamento = licitacoesFiltradas.filter(
    (l) => l.status === 'em_analise' || l.status === 'aguardando_certame'
  ).length;
  const totalAnalisesConcluidas = licitacoesFiltradas.filter(
    (l) => !!l.analise && Object.keys(l.analise).length > 0
  ).length;

  // Timeline unificada
  const timeline = useMemo(() => {
    const itens: Array<{
      tipo: 'licitacao' | 'documento' | 'solicitacao';
      data: Date;
      titulo: string;
      descricao: string;
      status: string;
      href?: string;
      analisada?: boolean;
    }> = [];

    licitacoesFiltradas.forEach((l) => {
      itens.push({
        tipo: 'licitacao',
        data: l.criadoEm?.toDate?.() ?? new Date(),
        titulo: `Licitação #${l.numero}`,
        descricao: l.objeto,
        status: STATUS_LABELS[l.status as keyof typeof STATUS_LABELS] || l.status,
        href: `/licitacoes/${l.id}/analise`,
        analisada: !!l.analise && Object.keys(l.analise).length > 0,
      });
    });
    documentosFiltrados.forEach((d) => {
      itens.push({
        tipo: 'documento',
        data: d.criadoEm?.toDate?.() ?? new Date(),
        titulo: d.nome,
        descricao: d.descricao || d.tipo,
        status: DOCUMENTO_STATUS_LABELS[d.status],
      });
    });
    solicitacoesFiltradas.forEach((s) => {
      itens.push({
        tipo: 'solicitacao',
        data: s.criadoEm?.toDate?.() ?? new Date(),
        titulo: `Solicitação Conlicitação ${s.numeroConlicitacao}`,
        descricao: s.observacoesCliente || '',
        status: SOLICITACAO_STATUS_LABELS[s.status],
      });
    });

    return itens.sort((a, b) => b.data.getTime() - a.data.getTime());
  }, [licitacoesFiltradas, documentosFiltrados, solicitacoesFiltradas]);

  if (loading || !user) {
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

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70] flex items-center gap-2">
                <Activity className="w-7 h-7 text-[#4674e8]" />
                Acompanhamento
              </h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Acompanhe tudo que você enviou e o status das análises feitas pela equipe Abächerly.
              </p>
            </div>
          </div>

          {/* Filtros de período */}
          <div className="card p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1">
                <label className="text-xs font-bold text-[#1a2b45]/60 mb-1 block">Período</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: 'semana', l: 'Semana' },
                    { v: 'mes', l: 'Mês atual' },
                    { v: 'ano', l: 'Ano' },
                    { v: 'tudo', l: 'Tudo' },
                    { v: 'custom', l: 'Customizado' },
                  ] as { v: Periodo; l: string }[]).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setPeriodo(opt.v)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        periodo === opt.v
                          ? 'bg-[#2c4a70] text-white'
                          : 'bg-gray-100 text-[#1a2b45] hover:bg-gray-200'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {periodo === 'custom' && (
                <div className="flex gap-2">
                  <div>
                    <label className="text-xs font-bold text-[#1a2b45]/60 block">De</label>
                    <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#1a2b45]/60 block">Até</label>
                    <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {carregando ? (
            <div className="card p-8 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />
              <span className="text-[#1a2b45]/60">Carregando...</span>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                <Kpi label="Documentos enviados" value={totalDocsEnviados} icon={Upload} cor="blue" />
                <Kpi label="Documentos validados" value={totalDocsValidados} icon={CheckCircle} cor="green" />
                <Kpi label="Documentos recusados" value={totalDocsRecusados} icon={AlertCircle} cor="red" />
                <Kpi label="Em análise" value={totalAnalisesAndamento} icon={Clock} cor="amber" />
                <Kpi label="Analisadas" value={totalAnalisesConcluidas} icon={TrendingUp} cor="indigo" />
              </div>

              {/* Atalhos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <Link
                  href="/cliente/solicitacoes"
                  className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <ClipboardList className="w-6 h-6 text-[#4674e8]" />
                  <div>
                    <p className="font-bold text-[#2c4a70]">Solicitar análise</p>
                    <p className="text-xs text-[#1a2b45]/60">Pedir análise de uma nova licitação</p>
                  </div>
                </Link>
                <Link
                  href="/cliente/documentos"
                  className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <Upload className="w-6 h-6 text-[#4674e8]" />
                  <div>
                    <p className="font-bold text-[#2c4a70]">Enviar documentos</p>
                    <p className="text-xs text-[#1a2b45]/60">Subir certidões, propostas, contratos</p>
                  </div>
                </Link>
              </div>

              {/* Timeline */}
              <div className="card p-4 lg:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg lg:text-xl font-bold text-[#2c4a70]">Histórico de atividades</h2>
                  <Calendar className="w-5 h-5 text-[#4674e8]" />
                </div>

                {timeline.length === 0 ? (
                  <p className="text-sm text-[#1a2b45]/60 text-center py-8">
                    Nenhuma atividade no período selecionado.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((item, i) => {
                      const Icon =
                        item.tipo === 'licitacao' ? FileText :
                        item.tipo === 'documento' ? Upload :
                        ClipboardList;
                      const conteudo = (
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="w-9 h-9 rounded-full bg-[#4674e8]/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-[#4674e8]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-bold text-[#1a2b45] truncate">{item.titulo}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-[#1a2b45]/70">
                                {item.status}
                              </span>
                            </div>
                            {item.descricao && (
                              <p className="text-xs text-[#1a2b45]/70 mt-1 line-clamp-2">{item.descricao}</p>
                            )}
                            <p className="text-xs text-[#1a2b45]/50 mt-1">
                              {item.data.toLocaleString('pt-BR')}
                              {item.tipo === 'licitacao' && (
                                <span className="ml-2">
                                  {item.analisada ? '• Analisada pela equipe' : '• Aguardando análise'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                      return item.href ? (
                        <Link key={i} href={item.href}>{conteudo}</Link>
                      ) : (
                        <div key={i}>{conteudo}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, cor }: { label: string; value: number; icon: any; cor: string }) {
  const cores: Record<string, { bg: string; cls: string }> = {
    blue: { bg: 'bg-blue-50', cls: 'text-blue-700' },
    green: { bg: 'bg-green-50', cls: 'text-green-700' },
    red: { bg: 'bg-red-50', cls: 'text-red-700' },
    amber: { bg: 'bg-amber-50', cls: 'text-amber-700' },
    indigo: { bg: 'bg-indigo-50', cls: 'text-indigo-700' },
  };
  const c = cores[cor] || cores.blue;
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-[#1a2b45]/60 truncate">{label}</p>
          <p className="text-2xl font-bold text-[#2c4a70] mt-1">{value}</p>
        </div>
        <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${c.cls}`} />
        </div>
      </div>
    </div>
  );
}
