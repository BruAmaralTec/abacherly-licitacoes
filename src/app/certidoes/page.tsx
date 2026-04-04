'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCheck,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Calendar,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { PageSkeleton } from '@/components/Skeleton';
import Footer from '@/components/Footer';
import { listarCertidoes, recalcularStatusCertidoes, inicializarCertidoes } from '@/lib/services/certidoes';
import { Certidao, CertidaoStatus, CERTIDAO_NOMES } from '@/lib/types';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  valida: { label: 'Válida', color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle },
  vencendo: { label: 'Vencendo', color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle },
  vencida: { label: 'Vencida', color: 'text-red-700', bg: 'bg-red-50', icon: AlertTriangle },
  pendente: { label: 'Pendente', color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock },
};

export default function CertidoesPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [certidoes, setCertidoes] = useState<Certidao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile?.clientId) return;
      try {
        let dados = await listarCertidoes(userProfile.clientId);

        // Se não existem certidões, inicializar as 6 padrão
        if (dados.length === 0) {
          await inicializarCertidoes(userProfile.clientId);
          dados = await listarCertidoes(userProfile.clientId);
        }

        setCertidoes(dados);
      } catch (error) {
        console.error('Erro ao carregar certidões:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (userProfile) carregar();
  }, [userProfile]);

  const handleVerificarTodas = async () => {
    if (!userProfile?.clientId) return;
    setVerificando(true);
    try {
      await recalcularStatusCertidoes(userProfile.clientId);
      const dados = await listarCertidoes(userProfile.clientId);
      setCertidoes(dados);
    } catch (error) {
      console.error('Erro ao verificar certidões:', error);
    } finally {
      setVerificando(false);
    }
  };

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

  const certidoesValidas = certidoes.filter((c) => c.status === 'valida').length;
  const certidoesVencendo = certidoes.filter((c) => c.status === 'vencendo').length;
  const certidoesPendentes = certidoes.filter(
    (c) => c.status === 'pendente' || c.status === 'vencida'
  ).length;

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Certidões</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Gerencie todas as certidões da empresa
              </p>
            </div>
            <button
              onClick={handleVerificarTodas}
              disabled={verificando}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <RefreshCw className={`w-5 h-5 ${verificando ? 'animate-spin' : ''}`} />
              {verificando ? 'Verificando...' : 'Verificar Todas'}
            </button>
          </div>

          {carregando ? (
            <div className="card p-8 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />
              <span className="text-[#1a2b45]/60">Carregando certidões...</span>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                <div className="card p-3 sm:p-4 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{certidoesValidas}</p>
                  <p className="text-xs sm:text-sm text-[#1a2b45]/60">Válidas</p>
                </div>
                <div className="card p-3 sm:p-4 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">{certidoesVencendo}</p>
                  <p className="text-xs sm:text-sm text-[#1a2b45]/60">Vencendo</p>
                </div>
                <div className="card p-3 sm:p-4 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{certidoesPendentes}</p>
                  <p className="text-xs sm:text-sm text-[#1a2b45]/60">Pendentes</p>
                </div>
              </div>

              {/* Lista de Certidões */}
              <div className="space-y-4">
                {certidoes.map((certidao) => {
                  const cfg = statusConfig[certidao.status] || statusConfig.pendente;
                  const StatusIcon = cfg.icon;

                  return (
                    <div
                      key={certidao.id}
                      className={`card p-4 border-l-4 ${
                        certidao.status === 'valida'
                          ? 'border-green-500'
                          : certidao.status === 'vencendo'
                          ? 'border-amber-500'
                          : certidao.status === 'vencida'
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileCheck className="w-5 h-5 text-[#4674e8]" />
                            <h3 className="font-bold text-[#2c4a70]">{certidao.nome}</h3>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${cfg.bg} ${cfg.color}`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-[#1a2b45]/60">
                            {CERTIDAO_NOMES[certidao.tipo] || certidao.tipo}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                          {certidao.dataValidade && (
                            <div className="text-sm">
                              <div className="flex items-center gap-1 text-[#1a2b45]/60">
                                <Calendar className="w-4 h-4" />
                                <span>Validade:</span>
                              </div>
                              <p
                                className={`font-bold ${
                                  certidao.diasRestantes <= 0
                                    ? 'text-red-600'
                                    : certidao.diasRestantes <= 30
                                    ? 'text-amber-600'
                                    : 'text-[#1a2b45]'
                                }`}
                              >
                                {certidao.dataValidade.toDate().toLocaleDateString('pt-BR')}
                                <span className="text-xs ml-1">
                                  ({certidao.diasRestantes > 0 ? `${certidao.diasRestantes} dias` : 'Vencida'})
                                </span>
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            {certidao.urlPortal && (
                              <a
                                href={certidao.urlPortal}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Acessar portal"
                              >
                                <ExternalLink className="w-5 h-5 text-[#4674e8]" />
                              </a>
                            )}
                            {certidao.arquivoUrl && (
                              <a
                                href={certidao.arquivoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Baixar certidão"
                              >
                                <Download className="w-5 h-5 text-[#1a2b45]/60" />
                              </a>
                            )}
                            <button
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Atualizar"
                            >
                              <RefreshCw className="w-5 h-5 text-[#1a2b45]/60" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
