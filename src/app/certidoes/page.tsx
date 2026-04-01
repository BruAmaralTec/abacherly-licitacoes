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
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

// Dados de exemplo
const certidoes = [
  {
    id: '1',
    tipo: 'CND Federal',
    nome: 'Certidão Negativa de Débitos Federais',
    portal: 'Receita Federal',
    url: 'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir',
    dataEmissao: '2026-01-15',
    dataValidade: '2026-07-15',
    status: 'valida',
    arquivo: 'cnd_federal_2026.pdf'
  },
  {
    id: '2',
    tipo: 'FGTS',
    nome: 'Certificado de Regularidade do FGTS',
    portal: 'Caixa Econômica',
    url: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf',
    dataEmissao: '2026-02-01',
    dataValidade: '2026-03-01',
    status: 'vencendo',
    arquivo: 'crf_fgts_2026.pdf'
  },
  {
    id: '3',
    tipo: 'CNDT',
    nome: 'Certidão Negativa de Débitos Trabalhistas',
    portal: 'TST',
    url: 'https://www.tst.jus.br/certidao',
    dataEmissao: '2026-01-20',
    dataValidade: '2026-07-20',
    status: 'valida',
    arquivo: 'cndt_2026.pdf'
  },
  {
    id: '4',
    tipo: 'CND Estadual',
    nome: 'Certidão Negativa de Débitos Estaduais',
    portal: 'SEFAZ-PE',
    url: 'https://efisco.sefaz.pe.gov.br/',
    dataEmissao: '2026-02-10',
    dataValidade: '2026-05-10',
    status: 'valida',
    arquivo: 'cnd_estadual_2026.pdf'
  },
  {
    id: '5',
    tipo: 'CND Municipal',
    nome: 'Certidão Negativa de Débitos Municipais',
    portal: 'Prefeitura de Recife',
    url: 'https://cnd.recife.pe.gov.br/',
    dataEmissao: null,
    dataValidade: null,
    status: 'pendente',
    arquivo: null
  },
  {
    id: '6',
    tipo: 'Falência',
    nome: 'Certidão Negativa de Falência',
    portal: 'TJ-PE',
    url: 'https://www.tjpe.jus.br/certidoes',
    dataEmissao: '2025-12-01',
    dataValidade: '2026-01-01',
    status: 'vencida',
    arquivo: 'falencia_2025.pdf'
  },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  valida: { label: 'Válida', color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle },
  vencendo: { label: 'Vencendo', color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle },
  vencida: { label: 'Vencida', color: 'text-red-700', bg: 'bg-red-50', icon: AlertTriangle },
  pendente: { label: 'Pendente', color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock },
};

export default function CertidoesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  const calcularDiasRestantes = (dataValidade: string | null) => {
    if (!dataValidade) return null;
    const hoje = new Date();
    const validade = new Date(dataValidade);
    const diff = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const certidoesValidas = certidoes.filter(c => c.status === 'valida').length;
  const certidoesVencendo = certidoes.filter(c => c.status === 'vencendo').length;
  const certidoesPendentes = certidoes.filter(c => c.status === 'pendente' || c.status === 'vencida').length;

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
            <button className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
              <RefreshCw className="w-5 h-5" />
              Verificar Todas
            </button>
          </div>

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
              const StatusIcon = statusConfig[certidao.status].icon;
              const diasRestantes = calcularDiasRestantes(certidao.dataValidade);

              return (
                <div 
                  key={certidao.id}
                  className={`card p-4 border-l-4 ${
                    certidao.status === 'valida' ? 'border-green-500' :
                    certidao.status === 'vencendo' ? 'border-amber-500' :
                    certidao.status === 'vencida' ? 'border-red-500' :
                    'border-gray-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileCheck className="w-5 h-5 text-[#4674e8]" />
                        <h3 className="font-bold text-[#2c4a70]">{certidao.tipo}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusConfig[certidao.status].bg} ${statusConfig[certidao.status].color}`}>
                          {statusConfig[certidao.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-[#1a2b45]/80 mb-2">{certidao.nome}</p>
                      <p className="text-xs text-[#1a2b45]/60">{certidao.portal}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                      {certidao.dataValidade && (
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-[#1a2b45]/60">
                            <Calendar className="w-4 h-4" />
                            <span>Validade:</span>
                          </div>
                          <p className={`font-bold ${
                            diasRestantes && diasRestantes <= 30 ? 'text-amber-600' :
                            diasRestantes && diasRestantes <= 0 ? 'text-red-600' :
                            'text-[#1a2b45]'
                          }`}>
                            {new Date(certidao.dataValidade).toLocaleDateString('pt-BR')}
                            {diasRestantes !== null && (
                              <span className="text-xs ml-1">
                                ({diasRestantes > 0 ? `${diasRestantes} dias` : 'Vencida'})
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <a
                          href={certidao.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Acessar portal"
                        >
                          <ExternalLink className="w-5 h-5 text-[#4674e8]" />
                        </a>
                        {certidao.arquivo && (
                          <button 
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Baixar certidão"
                          >
                            <Download className="w-5 h-5 text-[#1a2b45]/60" />
                          </button>
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
        </main>

        <Footer />
      </div>
    </div>
  );
}
