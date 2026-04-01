'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MoreVertical,
  Calendar,
  Building2,
  DollarSign,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { listarLicitacoes } from '@/lib/services/licitacoes';
import { Licitacao, LicitacaoStatus } from '@/lib/types';

const statusConfig: Record<string, { label: string; class: string; bg: string }> = {
  em_analise: { label: 'Em Análise', class: 'text-blue-700', bg: 'bg-blue-50' },
  aguardando_certame: { label: 'Aguard. Certame', class: 'text-amber-700', bg: 'bg-amber-50' },
  aguardando_entrega: { label: 'Aguard. Entrega', class: 'text-orange-700', bg: 'bg-orange-50' },
  aguardando_pagamento: { label: 'Aguard. Pagamento', class: 'text-purple-700', bg: 'bg-purple-50' },
  concluida: { label: 'Concluída', class: 'text-green-700', bg: 'bg-green-50' },
  cancelada: { label: 'Cancelada', class: 'text-red-700', bg: 'bg-red-50' },
};

export default function LicitacoesPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile?.clientId) return;
      try {
        const dados = await listarLicitacoes(userProfile.clientId);
        setLicitacoes(dados);
      } catch (error) {
        console.error('Erro ao carregar licitações:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (userProfile) carregar();
  }, [userProfile]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  const filteredLicitacoes = licitacoes.filter(lic => {
    const matchesSearch =
      lic.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.objeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.orgao.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'todos' || lic.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Licitações</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Gerencie todas as licitações do sistema
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

          {/* Filters */}
          <div className="card p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1a2b45]/40" />
                <input
                  type="text"
                  placeholder="Buscar por número, objeto ou órgão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 transition-all text-sm"
                />
              </div>
              <div className="relative sm:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1a2b45]/40" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 transition-all text-sm appearance-none bg-white"
                >
                  <option value="todos">Todos os status</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="aguardando_certame">Aguard. Certame</option>
                  <option value="aguardando_entrega">Aguard. Entrega</option>
                  <option value="aguardando_pagamento">Aguard. Pagamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            </div>
          </div>

          {carregando ? (
            <div className="card p-8 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />
              <span className="text-[#1a2b45]/60">Carregando licitações...</span>
            </div>
          ) : (
            <>
              {/* Results count */}
              <p className="text-sm text-[#1a2b45]/60 mb-4">
                {filteredLicitacoes.length} licitação(ões) encontrada(s)
              </p>

              {/* Mobile Cards */}
              <div className="block lg:hidden space-y-4">
                {filteredLicitacoes.map((lic) => (
                  <div key={lic.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#4674e8]" />
                        <span className="font-bold text-[#2c4a70]">#{lic.numero}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusConfig[lic.status]?.bg || 'bg-gray-50'} ${statusConfig[lic.status]?.class || 'text-gray-700'}`}>
                        {statusConfig[lic.status]?.label || lic.status}
                      </span>
                    </div>

                    <p className="text-sm text-[#1a2b45] mb-2 line-clamp-2">{lic.objeto}</p>

                    <div className="flex items-center gap-2 text-xs text-[#1a2b45]/60 mb-2">
                      <Building2 className="w-4 h-4" />
                      <span className="truncate">{lic.orgao}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-xs text-[#1a2b45]/60">
                          <Calendar className="w-4 h-4" />
                          <span>{lic.dataCertame.toDate().toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold text-[#2c4a70]">
                          <DollarSign className="w-4 h-4" />
                          <span>{lic.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-[#4674e8]" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-[#1a2b45]/60" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-4 px-4 text-sm font-bold text-[#1a2b45]/60">Nº</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-[#1a2b45]/60">Objeto</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-[#1a2b45]/60">Órgão</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-[#1a2b45]/60">Data Certame</th>
                        <th className="text-right py-4 px-4 text-sm font-bold text-[#1a2b45]/60">Valor</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-[#1a2b45]/60">Status</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-[#1a2b45]/60">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLicitacoes.map((lic) => (
                        <tr key={lic.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-bold text-[#2c4a70]">{lic.numero}</span>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-[#1a2b45] truncate max-w-[300px]">{lic.objeto}</p>
                            <p className="text-xs text-[#1a2b45]/60 mt-1">{lic.modalidade}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-[#1a2b45]/80 truncate max-w-[180px]">{lic.orgao}</p>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-[#1a2b45]">
                              {lic.dataCertame.toDate().toLocaleDateString('pt-BR')}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="font-bold text-[#1a2b45]">
                              {lic.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig[lic.status]?.bg || 'bg-gray-50'} ${statusConfig[lic.status]?.class || 'text-gray-700'}`}>
                              {statusConfig[lic.status]?.label || lic.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Visualizar">
                                <Eye className="w-4 h-4 text-[#4674e8]" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                                <Edit className="w-4 h-4 text-[#1a2b45]/60" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Mais opções">
                                <MoreVertical className="w-4 h-4 text-[#1a2b45]/60" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredLicitacoes.length === 0 && (
                <div className="card p-8 text-center">
                  <FileText className="w-12 h-12 text-[#1a2b45]/20 mx-auto mb-4" />
                  <p className="text-[#1a2b45]/60">
                    {licitacoes.length === 0
                      ? 'Nenhuma licitação cadastrada. Clique em "Nova Licitação" para começar.'
                      : 'Nenhuma licitação encontrada com os filtros aplicados.'}
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
