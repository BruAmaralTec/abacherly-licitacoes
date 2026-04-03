'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
  Check,
  Eye,
  Save,
  Trophy,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import {
  listarRelatoriosPorCliente,
  listarTodosRelatorios,
  atualizarRelatorio,
  liberarRelatorio,
  liberarRelatoriosEmLote,
} from '@/lib/services/relatorios';
import {
  RelatorioLicitacao,
  FaseRelatorio,
  FASE_LABELS,
  RESULTADO_CORES,
  ResultadoLicitacao,
} from '@/lib/types';

const RESULTADO_LABELS: Record<ResultadoLicitacao, string> = {
  vencemos: 'Vencemos',
  finalizada: 'Finalizada',
  em_andamento: 'Em Andamento',
  suspensa: 'Suspensa',
  revogada: 'Revogada',
  anulada: 'Anulada',
  desclassificada: 'Desclassificada',
  aguardando: 'Aguardando',
};

const RESULTADO_TEXT_CORES: Record<ResultadoLicitacao, string> = {
  vencemos: 'text-green-700',
  finalizada: 'text-red-700',
  em_andamento: 'text-yellow-700',
  suspensa: 'text-gray-600',
  revogada: 'text-gray-600',
  anulada: 'text-gray-600',
  desclassificada: 'text-red-700',
  aguardando: 'text-yellow-700',
};

export default function RelatoriosPage() {
  const router = useRouter();
  const { user, userProfile, loading, isCliente } = useAuth();

  const [relatorios, setRelatorios] = useState<RelatorioLicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroResultado, setFiltroResultado] = useState('');
  const [mesesAbertos, setMesesAbertos] = useState<Set<string>>(new Set());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile?.clientId) return;
      try {
        const dados = isCliente
          ? await listarRelatoriosPorCliente(userProfile.clientId, true)
          : await listarTodosRelatorios(userProfile.clientId);
        setRelatorios(dados);

        // Abrir o mês mais recente por padrão
        if (dados.length > 0) {
          setMesesAbertos(new Set([dados[0].mes]));
        }
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (!loading && userProfile) carregar();
  }, [loading, userProfile, isCliente]);

  const toggleMes = (mes: string) => {
    setMesesAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(mes)) next.delete(mes);
      else next.add(mes);
      return next;
    });
  };

  const handleSalvarCampo = async (id: string, campo: string, valor: string | number | boolean) => {
    setSalvando(true);
    try {
      await atualizarRelatorio(id, { [campo]: valor, atualizadoPor: user?.uid });
      setRelatorios((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r))
      );
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSalvando(false);
    }
  };

  const handleLiberar = async (id: string) => {
    await liberarRelatorio(id);
    setRelatorios((prev) =>
      prev.map((r) => (r.id === id ? { ...r, liberadoParaCliente: true } : r))
    );
  };

  const handleLiberarTodosMes = async (mes: string) => {
    const ids = relatorios
      .filter((r) => r.mes === mes && !r.liberadoParaCliente)
      .map((r) => r.id!)
      .filter(Boolean);
    if (ids.length === 0) return;
    await liberarRelatoriosEmLote(ids);
    setRelatorios((prev) =>
      prev.map((r) => (r.mes === mes ? { ...r, liberadoParaCliente: true } : r))
    );
  };

  // Filtrar
  const relatoriosFiltrados = relatorios.filter((r) => {
    if (filtroMes && r.mes !== filtroMes) return false;
    if (filtroResultado && r.resultado !== filtroResultado) return false;
    return true;
  });

  // Agrupar por mês
  const meses = Array.from(new Set(relatoriosFiltrados.map((r) => r.mes)));
  const agrupadoPorMes = meses.map((mes) => ({
    mes,
    itens: relatoriosFiltrados.filter((r) => r.mes === mes),
  }));

  // Métricas
  const total = relatorios.length;
  const vencidas = relatorios.filter((r) => r.resultado === 'vencemos').length;
  const emAndamento = relatorios.filter((r) =>
    ['em_andamento', 'aguardando'].includes(r.resultado)
  ).length;
  const taxaSucesso = total > 0 ? ((vencidas / total) * 100).toFixed(1) : '0';

  // Meses disponíveis para filtro
  const mesesDisponiveis = Array.from(new Set(relatorios.map((r) => r.mes)));

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">
                Relatório de Licitações
              </h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Acompanhe o progresso de cada licitação por fases
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-[#2c4a70]">{total}</p>
              <p className="text-xs text-[#1a2b45]/60">Total</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{vencidas}</p>
              <p className="text-xs text-[#1a2b45]/60">Vencidas</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{emAndamento}</p>
              <p className="text-xs text-[#1a2b45]/60">Em Andamento</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-[#4674e8]">{taxaSucesso}%</p>
              <p className="text-xs text-[#1a2b45]/60">Taxa de Sucesso</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="card p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Mês</label>
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                >
                  <option value="">Todos</option>
                  {mesesDisponiveis.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Resultado</label>
                <select
                  value={filtroResultado}
                  onChange={(e) => setFiltroResultado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                >
                  <option value="">Todos</option>
                  {Object.entries(RESULTADO_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Relatório agrupado por mês */}
          {carregando ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#4674e8]" />
            </div>
          ) : agrupadoPorMes.length === 0 ? (
            <div className="card p-8 text-center text-[#1a2b45]/60">
              Nenhum relatório encontrado.
            </div>
          ) : (
            <div className="space-y-4 print:space-y-2">
              {agrupadoPorMes.map(({ mes, itens }) => (
                <div key={mes} className="card overflow-hidden">
                  {/* Header do mês */}
                  <button
                    onClick={() => toggleMes(mes)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {mesesAbertos.has(mes) ? (
                        <ChevronDown className="w-5 h-5 text-[#4674e8]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[#1a2b45]/40" />
                      )}
                      <h3 className="text-lg font-bold text-[#2c4a70]">{mes}</h3>
                      <span className="text-sm text-[#1a2b45]/60">
                        ({itens.length} licitaç{itens.length === 1 ? 'ão' : 'ões'})
                      </span>
                    </div>
                    {!isCliente && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLiberarTodosMes(mes);
                        }}
                        className="text-xs px-3 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                      >
                        Liberar todos
                      </button>
                    )}
                  </button>

                  {/* Conteúdo do mês */}
                  {mesesAbertos.has(mes) && (
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                      {itens.map((r) => (
                        <RelatorioCard
                          key={r.id}
                          relatorio={r}
                          readOnly={isCliente}
                          editandoId={editandoId}
                          onStartEdit={() => setEditandoId(r.id || null)}
                          onSave={handleSalvarCampo}
                          onLiberar={handleLiberar}
                          salvando={salvando}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

// ==================== Timeline Component ====================

function TimelineFases({ relatorio }: { relatorio: RelatorioLicitacao }) {
  const fases: { fase: FaseRelatorio; completa: boolean; detalhe: string }[] = [
    {
      fase: 'pedido',
      completa: !!relatorio.dataPedido,
      detalhe: relatorio.dataPedido?.toDate?.()
        ? relatorio.dataPedido.toDate().toLocaleDateString('pt-BR')
        : '',
    },
    {
      fase: 'analise',
      completa: relatorio.analise === 'ok',
      detalhe: relatorio.analise === 'ok' ? 'OK' : '',
    },
    {
      fase: 'certame',
      completa: !!relatorio.dataCertame,
      detalhe: relatorio.dataCertame?.toDate?.()
        ? relatorio.dataCertame.toDate().toLocaleDateString('pt-BR')
        : '',
    },
    {
      fase: 'classificacao',
      completa: !!relatorio.classificacao,
      detalhe: relatorio.classificacao || '',
    },
    {
      fase: 'resultado',
      completa: !!relatorio.resultado && !['em_andamento', 'aguardando'].includes(relatorio.resultado),
      detalhe: relatorio.resultado
        ? RESULTADO_LABELS[relatorio.resultado] || relatorio.resultado
        : '',
    },
  ];

  const corBase = RESULTADO_CORES[relatorio.resultado] || 'bg-gray-400';

  return (
    <div className="flex items-center gap-1 w-full">
      {fases.map((f, i) => (
        <div key={f.fase} className="flex-1 flex flex-col items-center">
          {/* Barra */}
          <div className="w-full flex items-center">
            <div
              className={`h-2 w-full rounded-full transition-all ${
                f.completa ? corBase : 'bg-gray-200'
              }`}
            />
          </div>
          {/* Label */}
          <div className="mt-1 text-center">
            <p className="text-[10px] font-medium text-[#1a2b45]/60 uppercase">
              {FASE_LABELS[f.fase]}
            </p>
            {f.detalhe && (
              <p className="text-[10px] text-[#1a2b45]/40">{f.detalhe}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== Relatorio Card ====================

function RelatorioCard({
  relatorio: r,
  readOnly,
  editandoId,
  onStartEdit,
  onSave,
  onLiberar,
  salvando,
}: {
  relatorio: RelatorioLicitacao;
  readOnly: boolean;
  editandoId: string | null;
  onStartEdit: () => void;
  onSave: (id: string, campo: string, valor: string | number | boolean) => Promise<void>;
  onLiberar: (id: string) => Promise<void>;
  salvando: boolean;
}) {
  const editando = editandoId === r.id;
  const [campos, setCampos] = useState({
    observacoes: r.observacoes || '',
    classificacao: r.classificacao || '',
    motivo: r.motivo || '',
    empresaVencedora: r.empresaVencedora || '',
  });

  const resultadoIcon = () => {
    switch (r.resultado) {
      case 'vencemos':
        return <Trophy className="w-4 h-4 text-green-600" />;
      case 'finalizada':
      case 'desclassificada':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'em_andamento':
      case 'aguardando':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50/50 transition-colors">
      {/* Timeline */}
      <TimelineFases relatorio={r} />

      {/* Detalhes */}
      <div className="mt-3 flex flex-col lg:flex-row lg:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-[#2c4a70] text-sm">{r.sequencial}</span>
            <span className="text-sm text-[#1a2b45]">{r.conlicitacaoOrgao}</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                RESULTADO_TEXT_CORES[r.resultado] || 'text-gray-600'
              }`}
            >
              {resultadoIcon()}
              {RESULTADO_LABELS[r.resultado] || r.status}
            </span>
            {!r.liberadoParaCliente && !readOnly && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                Não liberado
              </span>
            )}
          </div>

          {/* Campos editáveis ou read-only */}
          {editando && !readOnly ? (
            <div className="space-y-2 mt-2">
              <input
                value={campos.observacoes}
                onChange={(e) => setCampos({ ...campos, observacoes: e.target.value })}
                placeholder="Observações"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-[#4674e8] focus:outline-none"
                onBlur={() => r.id && onSave(r.id, 'observacoes', campos.observacoes)}
              />
              <div className="flex gap-2">
                <input
                  value={campos.classificacao}
                  onChange={(e) => setCampos({ ...campos, classificacao: e.target.value })}
                  placeholder="Classificação"
                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:border-[#4674e8] focus:outline-none"
                  onBlur={() => r.id && onSave(r.id, 'classificacao', campos.classificacao)}
                />
                <input
                  value={campos.motivo}
                  onChange={(e) => setCampos({ ...campos, motivo: e.target.value })}
                  placeholder="Motivo"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:border-[#4674e8] focus:outline-none"
                  onBlur={() => r.id && onSave(r.id, 'motivo', campos.motivo)}
                />
              </div>
              <input
                value={campos.empresaVencedora}
                onChange={(e) => setCampos({ ...campos, empresaVencedora: e.target.value })}
                placeholder="Empresa Vencedora"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-[#4674e8] focus:outline-none"
                onBlur={() => r.id && onSave(r.id, 'empresaVencedora', campos.empresaVencedora)}
              />
            </div>
          ) : (
            <>
              {r.observacoes && (
                <p className="text-sm text-[#1a2b45]/70">{r.observacoes}</p>
              )}
              {r.motivo && (
                <p className="text-xs text-[#1a2b45]/50">Motivo: {r.motivo}</p>
              )}
              {r.empresaVencedora && (
                <p className="text-xs text-[#1a2b45]/50">Vencedora: {r.empresaVencedora}</p>
              )}
            </>
          )}
        </div>

        {/* Valores + Ações */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            {r.valorEstimado > 0 && (
              <p className="text-sm font-bold text-[#2c4a70]">
                {r.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
            {r.precoCliente && r.precoCliente > 0 && (
              <p className="text-xs text-[#1a2b45]/50">
                Preço: {r.precoCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
            {r.valorFinal && r.valorFinal > 0 && (
              <p className="text-xs text-green-600">
                Final: {r.valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1">
              {!editando ? (
                <button
                  onClick={onStartEdit}
                  className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                  title="Editar"
                >
                  <Save className="w-4 h-4 text-[#4674e8]" />
                </button>
              ) : (
                <button
                  onClick={() => onStartEdit()}
                  className="p-1.5 hover:bg-green-50 rounded transition-colors"
                  title="Fechar edição"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </button>
              )}
              {!r.liberadoParaCliente && (
                <button
                  onClick={() => r.id && onLiberar(r.id)}
                  className="p-1.5 hover:bg-green-50 rounded transition-colors"
                  title="Liberar para cliente"
                >
                  <Eye className="w-4 h-4 text-green-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
