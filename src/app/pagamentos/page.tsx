'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Building2,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

// Dados de exemplo
const pagamentos = [
  {
    id: '1',
    licitacao: '90050/2025',
    objeto: 'Desenvolvimento de software',
    orgao: 'TRE-PE',
    valor: 954576.00,
    dataEntrega: '2026-02-15',
    status: 'aguardando',
    diasAguardando: 25
  },
  {
    id: '2',
    licitacao: '32/2025',
    objeto: 'Equipamentos de informática',
    orgao: 'Secretaria de Educação - PE',
    valor: 245000.00,
    dataEntrega: '2026-01-20',
    status: 'aguardando',
    diasAguardando: 51
  },
  {
    id: '3',
    licitacao: '28/2025',
    objeto: 'Serviços de manutenção predial',
    orgao: 'Câmara Municipal de Recife',
    valor: 89500.00,
    dataEntrega: '2025-12-10',
    dataPagamento: '2026-01-15',
    status: 'recebido',
    diasAguardando: 0
  },
  {
    id: '4',
    licitacao: '15/2025',
    objeto: 'Material de escritório',
    orgao: 'Prefeitura de Olinda',
    valor: 45000.00,
    dataEntrega: '2025-11-05',
    dataPagamento: '2025-12-20',
    status: 'recebido',
    diasAguardando: 0
  },
];

export default function PagamentosPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [filtro, setFiltro] = useState('todos');

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

  const pagamentosAguardando = pagamentos.filter(p => p.status === 'aguardando');
  const pagamentosRecebidos = pagamentos.filter(p => p.status === 'recebido');
  
  const totalAguardando = pagamentosAguardando.reduce((acc, p) => acc + p.valor, 0);
  const totalRecebido = pagamentosRecebidos.reduce((acc, p) => acc + p.valor, 0);

  const pagamentosFiltrados = filtro === 'todos' 
    ? pagamentos 
    : pagamentos.filter(p => p.status === filtro);

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
                    ? pagamento.diasAguardando > 45 ? 'border-red-500' : 'border-amber-500'
                    : 'border-green-500'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-5 h-5 text-[#4674e8]" />
                      <span className="font-bold text-[#2c4a70]">#{pagamento.licitacao}</span>
                      {pagamento.status === 'aguardando' && pagamento.diasAguardando > 45 && (
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
                        {new Date(pagamento.dataEntrega).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {pagamento.status === 'aguardando' ? (
                      <div>
                        <p className="text-xs text-[#1a2b45]/60">Aguardando há</p>
                        <p className={`text-sm font-bold ${pagamento.diasAguardando > 45 ? 'text-red-600' : 'text-amber-600'}`}>
                          {pagamento.diasAguardando} dias
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-[#1a2b45]/60">Data Pagamento</p>
                        <p className="text-sm font-medium text-green-600">
                          {new Date(pagamento.dataPagamento!).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}

                    <div className="text-right">
                      <p className="text-xs text-[#1a2b45]/60">Valor</p>
                      <p className="text-lg font-bold text-[#2c4a70]">
                        {pagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>

                    {pagamento.status === 'aguardando' && (
                      <button className="btn-primary text-sm py-2 px-4">
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
        </main>

        <Footer />
      </div>
    </div>
  );
}
