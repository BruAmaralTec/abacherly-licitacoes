'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  Calendar, 
  Building2,
  DollarSign,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function NovaLicitacaoPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const [numeroEdital, setNumeroEdital] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [dadosLicitacao, setDadosLicitacao] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [etapas, setEtapas] = useState({
    coleta: 'pendente',
    analise: 'pendente',
    certidoes: 'pendente',
    agenda: 'pendente'
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleBuscar = async () => {
    if (!numeroEdital.trim()) {
      setErro('Digite o número do edital');
      return;
    }

    setErro('');
    setBuscando(true);
    setDadosLicitacao(null);

    // Simulação de busca (será substituído pela integração real)
    setEtapas({ coleta: 'processando', analise: 'pendente', certidoes: 'pendente', agenda: 'pendente' });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setEtapas({ coleta: 'concluido', analise: 'processando', certidoes: 'pendente', agenda: 'pendente' });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setEtapas({ coleta: 'concluido', analise: 'concluido', certidoes: 'processando', agenda: 'pendente' });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setEtapas({ coleta: 'concluido', analise: 'concluido', certidoes: 'concluido', agenda: 'processando' });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setEtapas({ coleta: 'concluido', analise: 'concluido', certidoes: 'concluido', agenda: 'concluido' });

    // Dados simulados
    setDadosLicitacao({
      numero: numeroEdital,
      objeto: 'Material de higiene e limpeza para unidades de saúde municipais',
      orgao: 'Prefeitura Municipal de São Jerônimo',
      modalidade: 'Pregão Eletrônico',
      valor: 109628.40,
      dataCertame: '2026-03-20',
      horaCertame: '10:00',
      prazoEntrega: '30 dias',
      localEntrega: 'Almoxarifado Central',
      resumo: 'Licitação para aquisição de materiais de higiene incluindo detergentes, desinfetantes, papel higiênico e outros itens para abastecimento das unidades de saúde do município.',
      certidoesStatus: {
        cnd_federal: 'valida',
        fgts: 'valida',
        cndt: 'vencendo',
        estadual: 'valida',
        municipal: 'pendente'
      }
    });

    setBuscando(false);
  };

  const handleSalvar = () => {
    // Implementar salvamento no Firestore
    alert('Licitação salva com sucesso!');
    router.push('/licitacoes');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  const getEtapaIcon = (status: string) => {
    switch (status) {
      case 'processando':
        return <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />;
      case 'concluido':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-300" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />
      
      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link 
              href="/licitacoes" 
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#1a2b45]" />
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Nova Licitação</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Busque e processe uma nova licitação
              </p>
            </div>
          </div>

          {/* Busca */}
          <div className="card p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Buscar Licitação</h2>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#1a2b45] mb-2">
                  Número do Edital / Código PNCP / URL Conlicitação
                </label>
                <input
                  type="text"
                  value={numeroEdital}
                  onChange={(e) => setNumeroEdital(e.target.value)}
                  placeholder="Ex: 65/2025 ou cole o link completo"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#4674e8] focus:ring-2 focus:ring-[#4674e8]/20 transition-all"
                  disabled={buscando}
                />
              </div>
              <div className="sm:self-end">
                <button
                  onClick={handleBuscar}
                  disabled={buscando}
                  className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-3 px-6"
                >
                  {buscando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Buscar e Processar
                    </>
                  )}
                </button>
              </div>
            </div>

            {erro && (
              <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {erro}
              </div>
            )}
          </div>

          {/* Etapas de Processamento */}
          {(buscando || dadosLicitacao) && (
            <div className="card p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Processamento</h2>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg border-2 transition-all ${etapas.coleta === 'concluido' ? 'border-green-200 bg-green-50' : etapas.coleta === 'processando' ? 'border-[#4674e8] bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getEtapaIcon(etapas.coleta)}
                    <span className="font-bold text-sm text-[#1a2b45]">Coleta</span>
                  </div>
                  <p className="text-xs text-[#1a2b45]/60">Dados do edital</p>
                </div>

                <div className={`p-4 rounded-lg border-2 transition-all ${etapas.analise === 'concluido' ? 'border-green-200 bg-green-50' : etapas.analise === 'processando' ? 'border-[#4674e8] bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getEtapaIcon(etapas.analise)}
                    <span className="font-bold text-sm text-[#1a2b45]">Análise</span>
                  </div>
                  <p className="text-xs text-[#1a2b45]/60">Resumo gerado</p>
                </div>

                <div className={`p-4 rounded-lg border-2 transition-all ${etapas.certidoes === 'concluido' ? 'border-green-200 bg-green-50' : etapas.certidoes === 'processando' ? 'border-[#4674e8] bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getEtapaIcon(etapas.certidoes)}
                    <span className="font-bold text-sm text-[#1a2b45]">Certidões</span>
                  </div>
                  <p className="text-xs text-[#1a2b45]/60">Verificadas</p>
                </div>

                <div className={`p-4 rounded-lg border-2 transition-all ${etapas.agenda === 'concluido' ? 'border-green-200 bg-green-50' : etapas.agenda === 'processando' ? 'border-[#4674e8] bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getEtapaIcon(etapas.agenda)}
                    <span className="font-bold text-sm text-[#1a2b45]">Agenda</span>
                  </div>
                  <p className="text-xs text-[#1a2b45]/60">Eventos criados</p>
                </div>
              </div>
            </div>
          )}

          {/* Dados da Licitação */}
          {dadosLicitacao && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="card p-4 sm:p-6">
                <h2 className="text-lg font-bold text-[#2c4a70] mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#4674e8]" />
                  Dados da Licitação
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1">Número</label>
                    <p className="font-bold text-[#2c4a70]">{dadosLicitacao.numero}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1">Modalidade</label>
                    <p className="font-bold text-[#2c4a70]">{dadosLicitacao.modalidade}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-[#1a2b45]/60 mb-1">Objeto</label>
                    <p className="text-[#1a2b45]">{dadosLicitacao.objeto}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1 flex items-center gap-1">
                      <Building2 className="w-4 h-4" /> Órgão
                    </label>
                    <p className="text-[#1a2b45]">{dadosLicitacao.orgao}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" /> Valor Estimado
                    </label>
                    <p className="font-bold text-[#2c4a70] text-lg">
                      {dadosLicitacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> Data do Certame
                    </label>
                    <p className="text-[#1a2b45]">
                      {new Date(dadosLicitacao.dataCertame).toLocaleDateString('pt-BR')} às {dadosLicitacao.horaCertame}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1a2b45]/60 mb-1">Prazo de Entrega</label>
                    <p className="text-[#1a2b45]">{dadosLicitacao.prazoEntrega}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm text-[#1a2b45]/60 mb-2">Resumo (gerado por IA)</label>
                  <p className="text-sm text-[#1a2b45] bg-gray-50 p-4 rounded-lg">
                    {dadosLicitacao.resumo}
                  </p>
                </div>
              </div>

              {/* Status das Certidões */}
              <div className="card p-4 sm:p-6">
                <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Status das Certidões</h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(dadosLicitacao.certidoesStatus).map(([key, status]) => (
                    <div 
                      key={key}
                      className={`p-3 rounded-lg text-center ${
                        status === 'valida' ? 'bg-green-50' :
                        status === 'vencendo' ? 'bg-amber-50' :
                        'bg-red-50'
                      }`}
                    >
                      <p className="text-xs font-bold text-[#1a2b45] uppercase mb-1">
                        {key.replace('_', ' ')}
                      </p>
                      <span className={`text-xs font-bold ${
                        status === 'valida' ? 'text-green-600' :
                        status === 'vencendo' ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {status === 'valida' ? '✓ Válida' :
                         status === 'vencendo' ? '⚠ Vencendo' :
                         '✗ Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <Link 
                  href="/licitacoes"
                  className="btn-secondary text-center"
                >
                  Cancelar
                </Link>
                <button
                  onClick={handleSalvar}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Salvar Licitação
                </button>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
