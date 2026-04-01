'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building2,
  FileText,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { listarPagamentos, confirmarRecebimento } from '@/lib/services/pagamentos';
import { Pagamento } from '@/lib/types';

export default function PagamentosPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [filtro, setFiltro] = useState('todos');
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
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
        const dados = await listarPagamentos(userProfile.clientId);
        setPagamentos(dados);
      } catch (error) {
        console.error('Erro ao carregar pagamentos:', error);
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

  const handleConfirmar = async (pagamentoId: string) => {
    try {
      await confirmarRecebimento(pagamentoId, new Date());
      setPagamentos((prev) =>
        prev.map((p) =>
          p.id === pagamentoId
            ? { ...p, status: 'recebido' as const, diasAtraso: 0 }
            : p
        )
      );
    } catch (error) {
      console.error('Erro ao confirmar recebimento:', error);
    }
  };

  const pagamentosAguardando = pagamentos.filter((p) => p.status === 'aguardando');
  const pagamentosRecebidos = pagamentos.filter((p) => p.status === 'recebido');

  const totalAguardando = pagamentosAguardando.reduce((acc, p) => acc + p.valor, 0);
  const totalRecebido = pagamentosRecebidos.reduce((acc, p) => acc + p.valor, 0);

  const pagamentosFiltrados =
    filtro === 'todos' ? pagamentos : pagamentos.filter((p) => p.status === filtro);

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Pagamentos</h1>
            <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
              Acompanhe os pagamentos e comissões pendentes
            </p>
          </div>

          {carregando ? (
            <div className="card p-8 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />
              <span className="text-[#1a2b45]/60">Carregando pagamentos...</span>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#1a2b45]/60">Aguardando</p>
                      <p className="text-2xl font-bold text-amber-600">{pagamentosAguardando.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#1a2b45]/60">Total Aguardando</p>
                      <p className="text-xl font-bold text-amber-600">
                        {totalAguardando.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#1a2b45]/60">Recebidos</p>
                      <p className="text-2xl font-bold text-green-600">{pagamentosRecebidos.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#1a2b45]/60">Total Recebido</p>
                      <p className="text-xl font-bold text-green-600">
                        {totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setFiltro('todos')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filtro === 'todos'
                      ? 'bg-[#2c4a70] text-white'
                      : 'bg-white text-[#1a2b45] hover:bg-gray-100'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltro('aguardando')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filtro === 'aguardando'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-[#1a2b45] hover:bg-gray-100'
                  }`}
                >
                  Aguardando
                </button>
                <button
                  onClick={() => setFiltro('recebido')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filtro === 'recebido'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-[#1a2b45] hover:bg-gray-100'
                  }`}
                >
                  Recebidos
                </button>
              </div>

              {/* Lista de Pagamentos */}
              <div className="space-y-4">
                {pagamentosFiltrados.map((pagamento) => (
                  <div
                    key={pagamento.id}
                    className={`card p-4 border-l-4 ${
                      pagamento.status === 'aguardando'
                        ? pagamento.diasAtraso > 45
                          ? 'border-red-500'
                          : 'border-amber-500'
                        : 'border-green-500'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-5 h-5 text-[#4674e8]" />
                          <span className="font-bold text-[#2c4a70]">#{pagamento.licitacaoNumero}</span>
                          {pagamento.status === 'aguardando' && pagamento.diasAtraso > 45 && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Atrasado
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#1a2b45] mb-1">{pagamento.objeto}</p>
                        <div className="flex items-center gap-1 text-xs text-[#1a2b45]/60">
                          <Building2 className="w-4 h-4" />
                          {pagamento.orgao}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div>
                          <p className="text-xs text-[#1a2b45]/60">Data Entrega</p>
                          <p className="text-sm font-medium text-[#1a2b45]">
                            {pagamento.dataEntrega.toDate().toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        {pagamento.status === 'aguardando' ? (
                          <div>
                            <p className="text-xs text-[#1a2b45]/60">Aguardando há</p>
                            <p
                              className={`text-sm font-bold ${
                                pagamento.diasAtraso > 45 ? 'text-red-600' : 'text-amber-600'
                              }`}
                            >
                              {pagamento.diasAtraso} dias
                            </p>
                          </div>
                        ) : (
                          pagamento.dataPagamento && (
                            <div>
                              <p className="text-xs text-[#1a2b45]/60">Data Pagamento</p>
                              <p className="text-sm font-medium text-green-600">
                                {pagamento.dataPagamento.toDate().toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          )
                        )}

                        <div className="text-right">
                          <p className="text-xs text-[#1a2b45]/60">Valor</p>
                          <p className="text-lg font-bold text-[#2c4a70]">
                            {pagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>

                        {pagamento.status === 'aguardando' && (
                          <button
                            onClick={() => handleConfirmar(pagamento.id!)}
                            className="btn-primary text-sm py-2 px-4"
                          >
                            Confirmar Recebimento
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {pagamentosFiltrados.length === 0 && (
                <div className="card p-8 text-center">
                  <DollarSign className="w-12 h-12 text-[#1a2b45]/20 mx-auto mb-4" />
                  <p className="text-[#1a2b45]/60">Nenhum pagamento encontrado</p>
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
