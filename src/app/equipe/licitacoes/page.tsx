'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Building2,
  Loader2,
  X,
  Trash2,
  Archive,
  ArchiveRestore,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { PageSkeleton } from '@/components/Skeleton';
import {
  listarTodasLicitacoes,
  excluirLicitacao,
  arquivarLicitacao,
} from '@/lib/services/licitacoes';
import { listarClientes } from '@/lib/services/clientes';
import { Licitacao, ClienteInfo, STATUS_LABELS } from '@/lib/types';

const statusConfig: Record<string, { class: string; bg: string }> = {
  em_analise: { class: 'text-blue-700', bg: 'bg-blue-50' },
  aguardando_certame: { class: 'text-amber-700', bg: 'bg-amber-50' },
  aguardando_entrega: { class: 'text-orange-700', bg: 'bg-orange-50' },
  aguardando_pagamento: { class: 'text-purple-700', bg: 'bg-purple-50' },
  concluida: { class: 'text-green-700', bg: 'bg-green-50' },
  cancelada: { class: 'text-red-700', bg: 'bg-red-50' },
};

type Periodo = 'todos' | '7d' | '30d' | '90d' | 'mes' | 'ano' | 'custom';

export default function EquipeLicitacoesPage() {
  const router = useRouter();
  const { user, userProfile, loading, isEquipe } = useAuth();
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('em_trabalho');
  const [filterClienteId, setFilterClienteId] = useState('todos');
  const [filterConlicitacao, setFilterConlicitacao] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('todos');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [verArquivadas, setVerArquivadas] = useState(false);

  // Seleção em lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && userProfile && !isEquipe) router.push('/dashboard');
  }, [user, userProfile, loading, isEquipe, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile) return;
      try {
        const [lics, cls] = await Promise.all([
          listarTodasLicitacoes(),
          listarClientes(),
        ]);
        setLicitacoes(lics);
        setClientes(cls);
      } catch (e) {
        console.error('Erro carregando licitações:', e);
      } finally {
        setCarregando(false);
      }
    }
    if (userProfile) carregar();
  }, [userProfile]);

  const clienteMap = useMemo(() => {
    const m = new Map<string, ClienteInfo>();
    clientes.forEach((c) => c.id && m.set(c.id, c));
    return m;
  }, [clientes]);

  const licitacoesFiltradas = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    const conlicTermo = filterConlicitacao.trim().toLowerCase();

    let inicio: Date | null = null;
    let fim: Date | null = null;
    const agora = new Date();
    if (periodo === '7d') {
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 7);
    } else if (periodo === '30d') {
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 30);
    } else if (periodo === '90d') {
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 90);
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

    return licitacoes.filter((l) => {
      // Arquivadas: só aparecem quando o toggle estiver ligado
      if (!verArquivadas && l.arquivada) return false;
      if (verArquivadas && !l.arquivada) return false;

      // Status
      if (filterStatus === 'em_trabalho') {
        if (l.status === 'concluida' || l.status === 'cancelada') return false;
      } else if (filterStatus !== 'todos' && l.status !== filterStatus) {
        return false;
      }

      // Cliente
      if (filterClienteId !== 'todos' && l.clientId !== filterClienteId) return false;

      // Código Conlicitação
      if (conlicTermo) {
        const cod = ((l as any).codigoConlicitacao || '').toString().toLowerCase();
        if (!cod.includes(conlicTermo)) return false;
      }

      // Período (sobre criadoEm)
      if (inicio || fim) {
        const dt = l.criadoEm?.toDate?.() ?? new Date();
        if (inicio && dt < inicio) return false;
        if (fim && dt > fim) return false;
      }

      // Termo geral
      if (termo) {
        const matches =
          l.numero?.toLowerCase().includes(termo) ||
          l.objeto?.toLowerCase().includes(termo) ||
          l.orgao?.toLowerCase().includes(termo);
        if (!matches) return false;
      }

      return true;
    });
  }, [
    licitacoes,
    searchTerm,
    filterStatus,
    filterClienteId,
    filterConlicitacao,
    periodo,
    dataInicial,
    dataFinal,
    verArquivadas,
  ]);

  function limparFiltros() {
    setSearchTerm('');
    setFilterStatus('em_trabalho');
    setFilterClienteId('todos');
    setFilterConlicitacao('');
    setPeriodo('todos');
    setDataInicial('');
    setDataFinal('');
    setVerArquivadas(false);
  }

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }
  function selecionarTodos(marcar: boolean) {
    setSelecionados(
      marcar ? new Set(licitacoesFiltradas.map((l) => l.id!).filter(Boolean)) : new Set()
    );
  }
  const todosSelecionados =
    licitacoesFiltradas.length > 0 &&
    licitacoesFiltradas.every((l) => l.id && selecionados.has(l.id));

  async function acaoArquivar(arquivar: boolean) {
    if (selecionados.size === 0) return;
    const verbo = arquivar ? 'arquivar' : 'desarquivar';
    if (!confirm(`Confirmar ${verbo} ${selecionados.size} licitação(ões)?`)) return;
    setAcaoEmAndamento(true);
    setDropdownAberto(false);
    try {
      await Promise.all(Array.from(selecionados).map((id) => arquivarLicitacao(id, arquivar)));
      setLicitacoes((prev) =>
        prev.map((l) => (l.id && selecionados.has(l.id) ? { ...l, arquivada: arquivar } : l))
      );
      setSelecionados(new Set());
    } catch (e: any) {
      alert(`Erro ao ${verbo}: ${e?.message || e}`);
    } finally {
      setAcaoEmAndamento(false);
    }
  }

  async function acaoDeletar() {
    if (selecionados.size === 0) return;
    if (
      !confirm(
        `ATENÇÃO: deletar permanentemente ${selecionados.size} licitação(ões)? Esta ação não pode ser desfeita.`
      )
    )
      return;
    setAcaoEmAndamento(true);
    setDropdownAberto(false);
    try {
      await Promise.all(Array.from(selecionados).map((id) => excluirLicitacao(id)));
      setLicitacoes((prev) => prev.filter((l) => !(l.id && selecionados.has(l.id))));
      setSelecionados(new Set());
    } catch (e: any) {
      alert(`Erro ao deletar: ${e?.message || e}`);
    } finally {
      setAcaoEmAndamento(false);
    }
  }

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
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Licitações em Trabalho</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Filtre por período, cliente ou número do Conlicitação.
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

          {/* Filtros */}
          <div className="card p-4 mb-6 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a2b45]/40" />
                <input
                  type="text"
                  placeholder="Buscar por número, objeto ou órgão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
              <input
                type="text"
                placeholder="Código Conlicitação"
                value={filterConlicitacao}
                onChange={(e) => setFilterConlicitacao(e.target.value)}
                className="lg:w-56"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-[#1a2b45]/60">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full"
                >
                  <option value="em_trabalho">Em trabalho (não concluídas)</option>
                  <option value="todos">Todos</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#1a2b45]/60">Cliente</label>
                <select
                  value={filterClienteId}
                  onChange={(e) => setFilterClienteId(e.target.value)}
                  className="w-full"
                >
                  <option value="todos">Todos os clientes</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razaoSocial || c.nomeFantasia || c.cnpj}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#1a2b45]/60">Período</label>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value as Periodo)}
                  className="w-full"
                >
                  <option value="todos">Todos</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="90d">Últimos 90 dias</option>
                  <option value="mes">Mês atual</option>
                  <option value="ano">Ano atual</option>
                  <option value="custom">Customizado...</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#1a2b45]/60 invisible">Ações</label>
                <button
                  onClick={limparFiltros}
                  className="btn-secondary w-full flex items-center justify-center gap-2 mt-1"
                >
                  <X className="w-4 h-4" />
                  Limpar filtros
                </button>
              </div>
            </div>

            {periodo === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1a2b45]/60">De</label>
                  <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1a2b45]/60">Até</label>
                  <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {carregando ? (
            <div className="card p-8 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />
              <span className="text-[#1a2b45]/60">Carregando...</span>
            </div>
          ) : (
            <>
              {/* Barra de seleção e ações */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <p className="text-sm text-[#1a2b45]/60">
                  {licitacoesFiltradas.length} licitação(ões) encontrada(s)
                  {selecionados.size > 0 && (
                    <span className="ml-3 font-bold text-[#2c4a70]">
                      — {selecionados.size} selecionada(s)
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-[#1a2b45]/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verArquivadas}
                      onChange={(e) => {
                        setVerArquivadas(e.target.checked);
                        setSelecionados(new Set());
                      }}
                      className="w-4 h-4 cursor-pointer accent-[#4674e8]"
                    />
                    Ver arquivadas
                  </label>
                  {selecionados.size > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setDropdownAberto((v) => !v)}
                        disabled={acaoEmAndamento}
                        className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
                      >
                        {acaoEmAndamento ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Ação <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      {dropdownAberto && !acaoEmAndamento && (
                        <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                          {!verArquivadas && (
                            <button
                              onClick={() => acaoArquivar(true)}
                              className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-50 text-[#1a2b45]"
                            >
                              <Archive className="w-4 h-4 text-amber-600" />
                              Arquivar selecionadas
                            </button>
                          )}
                          {verArquivadas && (
                            <button
                              onClick={() => acaoArquivar(false)}
                              className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-50 text-[#1a2b45]"
                            >
                              <ArchiveRestore className="w-4 h-4 text-green-600" />
                              Desarquivar selecionadas
                            </button>
                          )}
                          <button
                            onClick={acaoDeletar}
                            className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-red-50 text-red-600 border-t border-gray-100"
                          >
                            <Trash2 className="w-4 h-4" />
                            Deletar permanentemente
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile cards */}
              <div className="block lg:hidden space-y-3">
                {licitacoesFiltradas.map((lic) => (
                  <div key={lic.id} className="card p-4 relative">
                    <input
                      type="checkbox"
                      checked={!!(lic.id && selecionados.has(lic.id))}
                      onChange={() => lic.id && toggleSelecionado(lic.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-3 left-3 w-4 h-4 accent-[#4674e8] cursor-pointer"
                    />
                    <Link
                      href={`/licitacoes/${lic.id}/analise`}
                      className="block pl-7"
                    >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-[#2c4a70]">#{lic.numero}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusConfig[lic.status]?.bg || 'bg-gray-50'} ${statusConfig[lic.status]?.class || 'text-gray-700'}`}>
                        {STATUS_LABELS[lic.status as keyof typeof STATUS_LABELS] || lic.status}
                      </span>
                    </div>
                    <p className="text-sm text-[#1a2b45] line-clamp-2 mb-2">{lic.objeto}</p>
                    <div className="flex items-center gap-2 text-xs text-[#1a2b45]/60 mb-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="truncate">{lic.orgao}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#4674e8]">
                        {clienteMap.get(lic.clientId)?.razaoSocial || lic.clientId}
                      </span>
                      <span className="font-bold text-[#2c4a70]">
                        {lic.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={todosSelecionados}
                            onChange={(e) => selecionarTodos(e.target.checked)}
                            className="w-4 h-4 accent-[#4674e8] cursor-pointer"
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Nº</th>
                        <th className="text-left py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Cliente</th>
                        <th className="text-left py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Objeto / Órgão</th>
                        <th className="text-left py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Conlicitação</th>
                        <th className="text-left py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Certame</th>
                        <th className="text-right py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Valor</th>
                        <th className="text-center py-3 px-4 text-sm font-bold text-[#1a2b45]/60">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licitacoesFiltradas.map((lic) => (
                        <tr
                          key={lic.id}
                          className="border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/licitacoes/${lic.id}/analise`)}
                        >
                          <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!(lic.id && selecionados.has(lic.id))}
                              onChange={() => lic.id && toggleSelecionado(lic.id)}
                              className="w-4 h-4 accent-[#4674e8] cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-4 font-bold text-[#2c4a70]">{lic.numero}</td>
                          <td className="py-4 px-4">
                            <p className="text-[#1a2b45] truncate max-w-[180px]">
                              {clienteMap.get(lic.clientId)?.razaoSocial || lic.clientId}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-[#1a2b45] truncate max-w-[260px]">{lic.objeto}</p>
                            <p className="text-xs text-[#1a2b45]/60 mt-1 truncate max-w-[260px]">{lic.orgao}</p>
                          </td>
                          <td className="py-4 px-4 text-sm text-[#1a2b45]/80">
                            {(lic as any).codigoConlicitacao || '—'}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-[#1a2b45]">
                              {lic.dataCertame?.toDate?.()?.toLocaleDateString('pt-BR') || '—'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="font-bold text-[#1a2b45]">
                              {lic.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig[lic.status]?.bg || 'bg-gray-50'} ${statusConfig[lic.status]?.class || 'text-gray-700'}`}>
                              {STATUS_LABELS[lic.status as keyof typeof STATUS_LABELS] || lic.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {licitacoesFiltradas.length === 0 && (
                <div className="card p-8 text-center">
                  <FileText className="w-12 h-12 text-[#1a2b45]/20 mx-auto mb-4" />
                  <p className="text-[#1a2b45]/60">
                    {licitacoes.length === 0
                      ? 'Nenhuma licitação cadastrada ainda.'
                      : 'Nenhuma licitação com os filtros aplicados.'}
                  </p>
                </div>
              )}
            </>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
