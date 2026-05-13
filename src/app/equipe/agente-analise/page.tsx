'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { PageSkeleton } from '@/components/Skeleton';
import { listarClientes } from '@/lib/services/clientes';
import { enviarParaAnalise, aguardarAnalise, AnaliseResponse } from '@/lib/services/agente';
import { ClienteInfo } from '@/lib/types';

type Etapa = 'upload' | 'enviando' | 'processando' | 'concluido' | 'erro';

export default function AgenteAnalisePage() {
  const router = useRouter();
  const { user, userProfile, loading, isEquipe } = useAuth();
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [clienteId, setClienteId] = useState<string>('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [etapa, setEtapa] = useState<Etapa>('upload');
  const [resultado, setResultado] = useState<AnaliseResponse | null>(null);
  const [erro, setErro] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Progresso da conversão/análise (alimentado por onProgress do polling)
  const [fase, setFase] = useState<'convertendo' | 'analisando' | null>(null);
  const [progConv, setProgConv] = useState<number>(0);
  const [progAnalise, setProgAnalise] = useState<number>(0);
  const [mensagemFase, setMensagemFase] = useState<string>('');
  const [mostrarBarraConv, setMostrarBarraConv] = useState<boolean>(false);
  const tempoInicioAnaliseRef = useRef<number | null>(null);
  const tempoEstimadoAnaliseRef = useRef<number>(120000); // 2min default

  // Mimes que o Gemini lê direto — não precisam de conversão.
  const MIMES_DIRETOS = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
  ]);
  const EXTS_DIRETAS = /\.(pdf|png|jpe?g|txt)$/i;

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && userProfile && !isEquipe) router.push('/dashboard');
  }, [user, userProfile, loading, isEquipe, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile) return;
      try {
        const lista = await listarClientes();
        setClientes(lista);
        if (lista.length > 0) setClienteId(lista[0].id || '');
      } catch (e) {
        console.error('Erro listando clientes:', e);
      }
    }
    if (userProfile) carregar();
  }, [userProfile]);

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

  function adicionarArquivos(novos: FileList | null) {
    if (!novos) return;
    setArquivos((prev) => [...prev, ...Array.from(novos)]);
  }

  function removerArquivo(idx: number) {
    setArquivos((prev) => prev.filter((_, i) => i !== idx));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    adicionarArquivos(e.dataTransfer.files);
  }

  async function processar() {
    if (!clienteId) {
      setErro('Selecione um cliente.');
      return;
    }
    if (arquivos.length === 0) {
      setErro('Adicione pelo menos um arquivo.');
      return;
    }
    setErro('');
    setEtapa('enviando');
    setFase(null);
    setProgConv(0);
    setProgAnalise(0);
    setMensagemFase('');

    // Só exibe a barra de conversão se algum arquivo precisar de fato ser convertido
    // (Gemini lê PDF/PNG/JPG/TXT direto — sem barra para esses).
    const precisaConverter = arquivos.some(
      (f) => !MIMES_DIRETOS.has(f.type) && !EXTS_DIRETAS.test(f.name)
    );
    setMostrarBarraConv(precisaConverter);

    // Estimativa de tempo da análise: 60s base + 20s/MB de arquivos
    const tamanhoTotalMB = arquivos.reduce((s, f) => s + f.size, 0) / (1024 * 1024);
    tempoEstimadoAnaliseRef.current = 60_000 + tamanhoTotalMB * 20_000;
    tempoInicioAnaliseRef.current = null;

    try {
      const resp = await enviarParaAnalise({
        arquivos,
        clientId: clienteId,
        criadoPor: userProfile?.uid || 'unknown',
      });
      setEtapa('processando');

      const final = await aguardarAnalise(resp.analise_id, {
        intervaloMs: 2000,
        onProgress: (s) => {
          if (s.fase === 'convertendo') {
            setFase('convertendo');
            setProgConv(s.progresso_conversao ?? 0);
            setMensagemFase(s.mensagem || 'Convertendo arquivos...');
          } else if (s.fase === 'analisando') {
            // Marca início se ainda não marcou
            if (tempoInicioAnaliseRef.current === null) {
              tempoInicioAnaliseRef.current = Date.now();
              setProgConv(100);
            }
            const decorrido = Date.now() - tempoInicioAnaliseRef.current;
            const pct = Math.min(95, (decorrido / tempoEstimadoAnaliseRef.current) * 100);
            setFase('analisando');
            setProgAnalise(pct);
            setMensagemFase('Análise em andamento com Agentes de IA');
          }
        },
      });
      setProgConv(100);
      setProgAnalise(100);
      setResultado(final);
      setEtapa(final.status === 'erro' ? 'erro' : 'concluido');
      if (final.status === 'erro') setErro(final.erro || 'Erro desconhecido');
    } catch (e: any) {
      console.error(e);
      setErro(e?.message || 'Erro ao processar análise');
      setEtapa('erro');
    }
  }

  function novaAnalise() {
    setArquivos([]);
    setResultado(null);
    setErro('');
    setEtapa('upload');
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70] flex items-center gap-2">
                <Sparkles className="w-7 h-7 text-[#4674e8]" />
                Agente de Análise
              </h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Faça upload do edital e anexos — o agente extrai os dados, cria a licitação e responde a análise técnica.
              </p>
            </div>
          </div>

          {/* UPLOAD */}
          {etapa === 'upload' && (
            <div className="card p-6 space-y-6">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-bold text-[#1a2b45] mb-2">Cliente</label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full"
                >
                  <option value="">Selecione...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razaoSocial || c.nomeFantasia || c.cnpj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-[#4674e8]/40 rounded-xl p-8 text-center hover:bg-[#4674e8]/5 transition-colors cursor-pointer"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-[#4674e8] mx-auto mb-3" />
                <p className="font-bold text-[#2c4a70] mb-1">Arraste os arquivos aqui</p>
                <p className="text-sm text-[#1a2b45]/60">
                  ou clique para selecionar — PDF, Word, Excel, PowerPoint, ODF, RTF, HTML, PNG, JPG, TXT.
                  Office é convertido para PDF automaticamente.
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => adicionarArquivos(e.target.files)}
                />
              </div>

              {/* Lista de arquivos */}
              {arquivos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-[#1a2b45]">{arquivos.length} arquivo(s):</p>
                  {arquivos.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#4674e8] flex-shrink-0" />
                        <span className="text-sm truncate">{f.name}</span>
                        <span className="text-xs text-[#1a2b45]/50 flex-shrink-0">
                          ({(f.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => removerArquivo(i)}
                        className="p-1 hover:bg-red-50 rounded text-red-500"
                        aria-label="Remover"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {erro && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {erro}
                </div>
              )}

              <button
                onClick={processar}
                disabled={!clienteId || arquivos.length === 0}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-5 h-5" />
                Iniciar Análise
              </button>
            </div>
          )}

          {/* PROCESSANDO — 2 barras de progresso */}
          {(etapa === 'enviando' || etapa === 'processando') && (
            <div className="card p-8 space-y-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-[#4674e8] animate-spin flex-shrink-0" />
                <div>
                  <p className="font-bold text-[#2c4a70]">Processando análise</p>
                  <p className="text-sm text-[#1a2b45]/60">{mensagemFase || 'Enviando arquivos...'}</p>
                </div>
              </div>

              {/* Barra 1: Conversão (só se há arquivos office) */}
              {mostrarBarraConv && (
                <BarraProgresso
                  titulo="Conversão para PDF"
                  valor={progConv}
                  ativo={fase === 'convertendo'}
                  concluido={fase === 'analisando'}
                />
              )}

              {/* Barra 2: Análise IA */}
              <BarraProgresso
                titulo="Análise com IA (Gemini)"
                valor={progAnalise}
                ativo={fase === 'analisando' || !mostrarBarraConv}
                concluido={false}
              />

              <p className="text-xs text-[#1a2b45]/50 text-center">
                Análises completas podem levar de 1 a 5 minutos. Você pode acompanhar pela lista de licitações.
              </p>
            </div>
          )}

          {/* CONCLUÍDO */}
          {etapa === 'concluido' && resultado?.extracao && (
            <div className="space-y-6">
              <div className="card p-6 border-l-4 border-green-500">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h2 className="font-bold text-[#2c4a70] text-lg">Análise concluída</h2>
                    <p className="text-sm text-[#1a2b45]/70 mt-1">
                      Licitação criada automaticamente com os dados extraídos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h3 className="font-bold text-[#2c4a70]">Dados extraídos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <Campo label="Número" valor={resultado.extracao.numero} />
                  <Campo label="Cód. Conlicitação" valor={resultado.extracao.codigo_conlicitacao} />
                  <Campo label="UASG" valor={resultado.extracao.uasg} />
                  <Campo label="Órgão" valor={resultado.extracao.orgao} />
                  <Campo label="Modalidade" valor={resultado.extracao.modalidade} />
                  <Campo
                    label="Valor estimado"
                    valor={
                      resultado.extracao.valor_estimado
                        ? `R$ ${resultado.extracao.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'
                    }
                  />
                  <Campo label="Data certame" valor={resultado.extracao.data_certame} />
                  <Campo label="Hora certame" valor={resultado.extracao.hora_certame} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1a2b45]">Objeto resumido</p>
                  <p className="text-sm text-[#1a2b45]/80 mt-1">{resultado.extracao.objeto_resumido}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1a2b45]">Objeto completo</p>
                  <p className="text-sm text-[#1a2b45]/80 mt-1">{resultado.extracao.objeto}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {resultado.licitacao_id && (
                  <Link
                    href={`/licitacoes/${resultado.licitacao_id}/analise`}
                    className="btn-primary flex items-center justify-center gap-2 flex-1"
                  >
                    <Eye className="w-5 h-5" />
                    Ver análise completa
                  </Link>
                )}
                <button onClick={novaAnalise} className="btn-secondary flex-1">
                  Nova análise
                </button>
              </div>
            </div>
          )}

          {/* ERRO */}
          {etapa === 'erro' && (
            <div className="card p-6 border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="font-bold text-[#2c4a70]">
                    {erro.toLowerCase().includes('processamento') ? 'Análise ainda em andamento' : 'Erro ao processar'}
                  </h2>
                  <p className="text-sm text-red-700 mt-1">{erro || 'Erro desconhecido'}</p>
                  <div className="flex gap-3 mt-4">
                    <Link href="/equipe/licitacoes" className="btn-primary text-sm">
                      Ver licitações
                    </Link>
                    <button onClick={novaAnalise} className="btn-secondary">
                      Nova análise
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-[#1a2b45]/60">{label}</p>
      <p className="font-medium text-[#1a2b45]">{valor || '—'}</p>
    </div>
  );
}

function BarraProgresso({
  titulo,
  valor,
  ativo,
  concluido,
}: {
  titulo: string;
  valor: number;
  ativo: boolean;
  concluido: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(valor)));
  const corBarra = concluido
    ? 'bg-green-500'
    : ativo
    ? 'bg-[#4674e8]'
    : 'bg-gray-300';
  const corTexto = concluido ? 'text-green-700' : ativo ? 'text-[#2c4a70]' : 'text-gray-400';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-sm font-medium ${corTexto}`}>
          {titulo} {concluido && '✓'}
        </span>
        <span className={`text-sm font-bold ${corTexto}`}>{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${corBarra} transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
