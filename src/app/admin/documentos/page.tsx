'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCheck2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { PageSkeleton } from '@/components/Skeleton';
import Footer from '@/components/Footer';
import {
  listarDocumentosPendentes,
  validarDocumento,
  recusarDocumento,
} from '@/lib/services/documentos';
import { Documento, DOCUMENTO_STATUS_LABELS, TIPO_DOCUMENTO_LABELS } from '@/lib/types';

export default function AdminDocumentosPage() {
  const router = useRouter();
  const { user, userProfile, loading, isAdmin } = useAuth();

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalRecusa, setModalRecusa] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [filtro, setFiltro] = useState<'pendentes' | 'todos'>('pendentes');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdmin) router.push('/dashboard');
  }, [user, loading, router, isAdmin]);

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await listarDocumentosPendentes();
        setDocumentos(dados);
      } catch (error) {
        console.error('Erro ao carregar documentos:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (!loading && isAdmin) carregar();
  }, [loading, isAdmin]);

  const handleValidar = async (id: string) => {
    if (!user) return;
    await validarDocumento(id, user.uid);
    setDocumentos((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'validado' as const, validadoPor: user.uid } : d))
    );
  };

  const handleRecusar = async () => {
    if (!modalRecusa || !user || !motivoRecusa.trim()) return;
    await recusarDocumento(modalRecusa, user.uid, motivoRecusa.trim());
    setDocumentos((prev) =>
      prev.map((d) =>
        d.id === modalRecusa
          ? { ...d, status: 'recusado' as const, motivoRecusa: motivoRecusa.trim() }
          : d
      )
    );
    setModalRecusa(null);
    setMotivoRecusa('');
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

  const docsFiltrados =
    filtro === 'pendentes'
      ? documentos.filter((d) => d.status === 'enviado')
      : documentos;

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
            <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">
              Validar Documentação
            </h1>
            <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
              Valide ou recuse documentos enviados pelos clientes
            </p>
          </div>

          {/* Filtro */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFiltro('pendentes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'pendentes'
                  ? 'bg-[#4674e8] text-white'
                  : 'bg-white text-[#1a2b45]/70 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFiltro('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'todos'
                  ? 'bg-[#4674e8] text-white'
                  : 'bg-white text-[#1a2b45]/70 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Todos
            </button>
          </div>

          {/* Lista */}
          <div className="card overflow-hidden">
            {carregando ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#4674e8]" />
              </div>
            ) : docsFiltrados.length === 0 ? (
              <div className="p-8 text-center text-[#1a2b45]/60">
                {filtro === 'pendentes'
                  ? 'Nenhum documento pendente de validação.'
                  : 'Nenhum documento encontrado.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {docsFiltrados.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <FileText className="w-4 h-4 text-[#4674e8]" />
                          <span className="font-medium text-[#2c4a70]">{doc.nome}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-[#1a2b45]/60">
                            {TIPO_DOCUMENTO_LABELS[doc.tipo]}
                          </span>
                          {getStatusBadge(doc.status)}
                        </div>
                        {doc.descricao && (
                          <p className="text-sm text-[#1a2b45]/70">{doc.descricao}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#1a2b45]/50">
                          <span>Cliente: {doc.clientId}</span>
                          {doc.licitacaoNumero && <span>Licitação: #{doc.licitacaoNumero}</span>}
                          <span>
                            {doc.criadoEm?.toDate?.()
                              ? doc.criadoEm.toDate().toLocaleDateString('pt-BR')
                              : ''}
                          </span>
                          <span>{(doc.tamanhoBytes / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        {doc.motivoRecusa && (
                          <p className="text-sm text-red-600 mt-1 italic">
                            Motivo: {doc.motivoRecusa}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.arquivoUrl && (
                          <a
                            href={doc.arquivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <ExternalLink className="w-4 h-4 text-[#4674e8]" />
                          </a>
                        )}
                        {doc.status === 'enviado' && (
                          <>
                            <button
                              onClick={() => doc.id && handleValidar(doc.id)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Validar
                            </button>
                            <button
                              onClick={() => setModalRecusa(doc.id || null)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Recusar
                            </button>
                          </>
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

      {/* Modal de Recusa */}
      {modalRecusa && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[#2c4a70] mb-4">Recusar Documento</h3>
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
