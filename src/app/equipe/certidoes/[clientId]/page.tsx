'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileCheck,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  Upload,
  ExternalLink,
  Download,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { PageSkeleton } from '@/components/Skeleton';
import { listarCertidoes, inicializarCertidoes } from '@/lib/services/certidoes';
import { buscarCliente } from '@/lib/services/clientes';
import { Certidao, ClienteInfo, CERTIDAO_NOMES, CertidaoStatus } from '@/lib/types';

const statusConfig: Record<CertidaoStatus, { label: string; bg: string; cls: string; icon: any }> = {
  valida: { label: 'Válida', bg: 'bg-green-50', cls: 'text-green-700', icon: CheckCircle },
  vencendo: { label: 'Vencendo', bg: 'bg-amber-50', cls: 'text-amber-700', icon: AlertTriangle },
  vencida: { label: 'Vencida', bg: 'bg-red-50', cls: 'text-red-700', icon: AlertTriangle },
  pendente: { label: 'Pendente', bg: 'bg-gray-100', cls: 'text-gray-700', icon: Clock },
};

export default function ClienteCertidoesPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  const { user, userProfile, loading, isEquipe } = useAuth();
  const [cliente, setCliente] = useState<ClienteInfo | null>(null);
  const [certidoes, setCertidoes] = useState<Certidao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && userProfile && !isEquipe) router.push('/dashboard');
  }, [user, userProfile, loading, isEquipe, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile || !clientId) return;
      try {
        const [cli, certs] = await Promise.all([
          buscarCliente(clientId),
          listarCertidoes(clientId),
        ]);
        setCliente(cli);
        if (certs.length === 0) {
          await inicializarCertidoes(clientId);
          const recarregadas = await listarCertidoes(clientId);
          setCertidoes(recarregadas);
        } else {
          setCertidoes(certs);
        }
      } catch (e) {
        console.error('Erro carregando dados do cliente:', e);
      } finally {
        setCarregando(false);
      }
    }
    if (userProfile) carregar();
  }, [userProfile, clientId]);

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
          {/* Voltar */}
          <Link
            href="/equipe/certidoes"
            className="inline-flex items-center gap-2 text-sm text-[#4674e8] hover:text-[#2c4a70] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para todas as certidões
          </Link>

          {/* Header cliente */}
          <div className="card p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#4674e8]/10 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#4674e8]" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl lg:text-2xl font-bold text-[#2c4a70]">
                  {cliente?.razaoSocial || 'Cliente'}
                </h1>
                {cliente?.nomeFantasia && (
                  <p className="text-sm text-[#1a2b45]/70">{cliente.nomeFantasia}</p>
                )}
                <p className="text-xs text-[#1a2b45]/60 mt-1">CNPJ: {cliente?.cnpj || '—'}</p>
              </div>
            </div>
          </div>

          {carregando ? (
            <div className="card p-8 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />
              <span className="text-[#1a2b45]/60">Carregando certidões...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {certidoes.map((c) => {
                const cfg = statusConfig[c.status] || statusConfig.pendente;
                const StatusIcon = cfg.icon;
                return (
                  <div key={c.id} className="card p-4 border-l-4 border-[#4674e8]/40">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileCheck className="w-6 h-6 text-[#4674e8] flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-[#2c4a70]">
                              {CERTIDAO_NOMES[c.tipo] || c.tipo}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.cls}`}>
                              <StatusIcon className="w-3 h-3 inline mr-1" />
                              {cfg.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
                            {c.dataEmissao && (
                              <InfoRow icon={Calendar} label="Emissão">
                                {c.dataEmissao.toDate().toLocaleDateString('pt-BR')}
                              </InfoRow>
                            )}
                            {c.dataValidade && (
                              <InfoRow icon={Calendar} label="Validade">
                                {c.dataValidade.toDate().toLocaleDateString('pt-BR')}
                                {c.diasRestantes > 0 && (
                                  <span className="text-xs text-[#1a2b45]/60 ml-1">
                                    ({c.diasRestantes} dias restantes)
                                  </span>
                                )}
                              </InfoRow>
                            )}
                            <InfoRow icon={Upload} label="Carregado em">
                              {c.atualizadoEm?.toDate?.().toLocaleString('pt-BR') || '—'}
                            </InfoRow>
                            <InfoRow icon={User} label="Carregado por">
                              {(c as any).enviadoPor || (c as any).atualizadoPor || '—'}
                            </InfoRow>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.urlPortal && (
                          <a
                            href={c.urlPortal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Acessar portal de emissão"
                          >
                            <ExternalLink className="w-5 h-5 text-[#4674e8]" />
                          </a>
                        )}
                        {c.arquivoUrl && (
                          <a
                            href={c.arquivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Baixar certidão"
                          >
                            <Download className="w-5 h-5 text-[#1a2b45]/60" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {certidoes.length === 0 && (
                <div className="card p-8 text-center">
                  <FileCheck className="w-12 h-12 text-[#1a2b45]/20 mx-auto mb-4" />
                  <p className="text-[#1a2b45]/60">Nenhuma certidão cadastrada para este cliente.</p>
                </div>
              )}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-[#1a2b45]/40 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-[#1a2b45]/60">{label}</p>
        <p className="text-[#1a2b45]">{children}</p>
      </div>
    </div>
  );
}
