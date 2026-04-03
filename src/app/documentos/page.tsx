'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import {
  uploadDocumento,
  listarDocumentosPorCliente,
  validarArquivo,
  excluirDocumento,
} from '@/lib/services/documentos';
import { listarLicitacoes } from '@/lib/services/licitacoes';
import {
  Documento,
  Licitacao,
  DOCUMENTO_STATUS_LABELS,
  TIPO_DOCUMENTO_LABELS,
  TipoDocumento,
} from '@/lib/types';

export default function DocumentosPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);

  // Form state
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState<TipoDocumento>('outro');
  const [descricao, setDescricao] = useState('');
  const [licitacaoId, setLicitacaoId] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile?.clientId) return;
      try {
        const [docs, lics] = await Promise.all([
          listarDocumentosPorCliente(userProfile.clientId),
          listarLicitacoes(userProfile.clientId),
        ]);
        setDocumentos(docs);
        setLicitacoes(lics);
      } catch (error) {
        console.error('Erro ao carregar:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (!loading && userProfile) carregar();
  }, [loading, userProfile]);

  const handleFileSelect = (file: File) => {
    const erroValidacao = validarArquivo(file);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    setArquivo(file);
    setErro('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!arquivo || !userProfile?.clientId || !user) return;

    setErro('');
    setSucesso('');
    setEnviando(true);
    setProgresso(0);

    try {
      const licSelecionada = licitacoes.find((l) => l.id === licitacaoId);
      await uploadDocumento(
        arquivo,
        userProfile.clientId,
        user.uid,
        tipo,
        descricao.trim() || undefined,
        licitacaoId || undefined,
        licSelecionada?.numero,
        (percent) => setProgresso(percent)
      );

      setSucesso('Documento enviado com sucesso!');
      setArquivo(null);
      setTipo('outro');
      setDescricao('');
      setLicitacaoId('');
      setMostrarForm(false);

      const docs = await listarDocumentosPorCliente(userProfile.clientId);
      setDocumentos(docs);
    } catch (error: any) {
      setErro(error.message || 'Erro ao enviar documento');
    } finally {
      setEnviando(false);
      setProgresso(0);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja excluir este documento?')) return;
    try {
      await excluirDocumento(id);
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    } catch (error: any) {
      setErro(error.message || 'Erro ao excluir documento');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { cor: string; icon: React.ReactNode }> = {
      enviado: { cor: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
      validado: { cor: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
      recusado: { cor: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
    };
    const c = config[status] || config.enviado;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.cor}`}>
        {c.icon}
        {DOCUMENTO_STATUS_LABELS[status as keyof typeof DOCUMENTO_STATUS_LABELS] || status}
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

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Enviar Documentos</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Envie documentos para a Abacherly
              </p>
            </div>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Novo Documento</span>
            </button>
          </div>

          {/* Upload Form */}
          {mostrarForm && (
            <div className="card p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-bold text-[#2c4a70] mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#4674e8]" />
                Enviar Documento
              </h2>

              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-[#4674e8] bg-blue-50'
                      : arquivo
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 hover:border-[#4674e8] hover:bg-blue-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                  {arquivo ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-6 h-6 text-green-600" />
                      <span className="font-medium text-green-700">{arquivo.name}</span>
                      <span className="text-sm text-green-600">
                        ({(arquivo.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-[#1a2b45]/60">
                        Arraste um arquivo ou <span className="text-[#4674e8] font-medium">clique para selecionar</span>
                      </p>
                      <p className="text-xs text-[#1a2b45]/40 mt-1">PDF, PNG ou JPG (max 10MB)</p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a2b45] mb-2">
                      Tipo de Documento
                    </label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as TipoDocumento)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                    >
                      {Object.entries(TIPO_DOCUMENTO_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a2b45] mb-2">
                      Licitação (opcional)
                    </label>
                    <select
                      value={licitacaoId}
                      onChange={(e) => setLicitacaoId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20"
                    >
                      <option value="">Nenhuma</option>
                      {licitacoes.map((l) => (
                        <option key={l.id} value={l.id}>#{l.numero} - {l.orgao}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a2b45] mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Informações sobre o documento..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 resize-none"
                  />
                </div>

                {/* Progress Bar */}
                {enviando && progresso > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#4674e8] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!arquivo || enviando}
                  className="btn-primary flex items-center justify-center gap-2 py-3 px-6 disabled:opacity-50"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando... {Math.round(progresso)}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Enviar Documento
                    </>
                  )}
                </button>
              </div>

              {erro && (
                <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {erro}
                </div>
              )}
              {sucesso && (
                <div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  {sucesso}
                </div>
              )}
            </div>
          )}

          {/* Lista de Documentos */}
          <div className="card p-4 sm:p-6">
            <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Meus Documentos</h2>

            {carregando ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#4674e8]" />
              </div>
            ) : documentos.length === 0 ? (
              <p className="text-center text-[#1a2b45]/60 py-8">
                Nenhum documento enviado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <FileText className="w-4 h-4 text-[#4674e8]" />
                          <span className="font-medium text-[#2c4a70] truncate">{doc.nome}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-[#1a2b45]/60">
                            {TIPO_DOCUMENTO_LABELS[doc.tipo]}
                          </span>
                          {getStatusBadge(doc.status)}
                        </div>
                        {doc.descricao && (
                          <p className="text-sm text-[#1a2b45]/70 mt-1">{doc.descricao}</p>
                        )}
                        {doc.licitacaoNumero && (
                          <p className="text-xs text-[#1a2b45]/50 mt-1">
                            Licitação: #{doc.licitacaoNumero}
                          </p>
                        )}
                        {doc.motivoRecusa && (
                          <p className="text-sm text-red-600 mt-1 italic">
                            Motivo: {doc.motivoRecusa}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="text-xs text-[#1a2b45]/60">
                          {doc.criadoEm?.toDate?.()
                            ? doc.criadoEm.toDate().toLocaleDateString('pt-BR')
                            : ''}
                        </p>
                        {doc.arquivoUrl && (
                          <a
                            href={doc.arquivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <ExternalLink className="w-4 h-4 text-[#4674e8]" />
                          </a>
                        )}
                        {doc.status === 'enviado' && (
                          <button
                            onClick={() => doc.id && handleExcluir(doc.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
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
