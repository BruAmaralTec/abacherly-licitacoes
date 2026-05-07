'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Upload,
  FileText,
  Loader2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Download,
  User,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { PageSkeleton } from '@/components/Skeleton';
import {
  listarExemplos,
  uploadExemplo,
  excluirExemplo,
  ExemploAnalise,
} from '@/lib/services/exemplosAnalise';

export default function TreinamentoAgentePage() {
  const router = useRouter();
  const { user, userProfile, loading, isAdmTecnico } = useAuth();
  const [exemplos, setExemplos] = useState<ExemploAnalise[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackTipo, setFeedbackTipo] = useState<'ok' | 'erro' | ''>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && userProfile && !isAdmTecnico) router.push('/dashboard');
  }, [user, userProfile, loading, isAdmTecnico, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile) return;
      try {
        const lista = await listarExemplos();
        setExemplos(lista);
      } catch (e) {
        console.error('Erro carregando exemplos:', e);
      } finally {
        setCarregando(false);
      }
    }
    if (userProfile) carregar();
  }, [userProfile]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || !userProfile) return;
    setEnviando(true);
    setFeedback('');
    setFeedbackTipo('');
    try {
      let n = 0;
      for (const f of Array.from(files)) {
        n += 1;
        setProgresso(0);
        await uploadExemplo(
          f,
          userProfile.uid,
          userProfile.name,
          descricao,
          (p) => setProgresso(Math.round(p))
        );
      }
      const lista = await listarExemplos();
      setExemplos(lista);
      setFeedback(`${n} arquivo(s) enviado(s) com sucesso`);
      setFeedbackTipo('ok');
      setDescricao('');
      setTimeout(() => { setFeedback(''); setFeedbackTipo(''); }, 4000);
    } catch (e: any) {
      console.error(e);
      setFeedback(e?.message || 'Erro ao enviar arquivo');
      setFeedbackTipo('erro');
    } finally {
      setEnviando(false);
      setProgresso(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleExcluir(ex: ExemploAnalise) {
    if (!confirm(`Remover "${ex.nome}"?`)) return;
    try {
      await excluirExemplo(ex);
      setExemplos((prev) => prev.filter((e) => e.id !== ex.id));
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir');
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
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70] flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-[#4674e8]" />
              Treinamento do Agente
            </h1>
            <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
              Suba exemplos de análises completas (PDF/Word) que servem de referência para o agente IA.
              O agente lê estes arquivos e segue o mesmo padrão de respostas ao analisar novos editais.
            </p>
          </div>

          {/* Upload */}
          <div className="card p-5 mb-6">
            <h2 className="font-bold text-[#2c4a70] mb-3">Adicionar exemplo</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#1a2b45]/60 block mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Análise de Pregão Eletrônico — formato padrão Abächerly"
                  disabled={enviando}
                />
              </div>

              <div
                onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  enviando ? 'opacity-50' : 'border-[#4674e8]/40 hover:bg-[#4674e8]/5'
                }`}
                onClick={() => !enviando && inputRef.current?.click()}
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-10 h-10 text-[#4674e8] mx-auto mb-3 animate-spin" />
                    <p className="font-bold text-[#2c4a70]">Enviando... {progresso}%</p>
                    <div className="w-full max-w-sm h-2 bg-gray-200 rounded-full mt-3 mx-auto overflow-hidden">
                      <div className="h-full bg-[#4674e8] transition-all" style={{ width: `${progresso}%` }} />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-[#4674e8] mx-auto mb-3" />
                    <p className="font-bold text-[#2c4a70] mb-1">Arraste arquivos ou clique aqui</p>
                    <p className="text-xs text-[#1a2b45]/60">PDF, DOCX, DOC — múltiplos arquivos aceitos</p>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </div>

              {feedback && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  feedbackTipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {feedbackTipo === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {feedback}
                </div>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#2c4a70]">Exemplos carregados</h2>
              <span className="text-sm text-[#1a2b45]/60">
                {exemplos.length} arquivo(s)
              </span>
            </div>

            {carregando ? (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />
                <span className="text-[#1a2b45]/60">Carregando...</span>
              </div>
            ) : exemplos.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="w-12 h-12 text-[#1a2b45]/20 mx-auto mb-3" />
                <p className="text-[#1a2b45]/60 text-sm">
                  Nenhum exemplo cadastrado ainda. Suba o primeiro acima.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {exemplos.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <FileText className="w-5 h-5 text-[#4674e8] flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#1a2b45] truncate">{ex.nome}</p>
                        {ex.descricao && (
                          <p className="text-xs text-[#1a2b45]/70 mt-0.5 line-clamp-2">{ex.descricao}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-[#1a2b45]/60">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {ex.enviadoPorNome || ex.enviadoPor.slice(0, 8)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {ex.criadoEm?.toDate?.().toLocaleDateString('pt-BR')}
                          </span>
                          <span>{(ex.tamanhoBytes / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a
                        href={ex.arquivoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Baixar"
                      >
                        <Download className="w-4 h-4 text-[#1a2b45]/60" />
                      </a>
                      <button
                        onClick={() => handleExcluir(ex)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
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
