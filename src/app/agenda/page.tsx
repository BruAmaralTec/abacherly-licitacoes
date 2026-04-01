'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar as CalendarIcon, 
  Clock,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

// Dados de exemplo
const eventos = [
  {
    id: '1',
    tipo: 'sessao',
    titulo: 'Sessão Pública - Pregão 65/2025',
    data: '2026-03-12',
    hora: '14:00',
    orgao: 'Prefeitura São Jerônimo',
    licitacaoId: '1',
    concluido: false,
    urgente: true
  },
  {
    id: '2',
    tipo: 'revisao',
    titulo: 'Revisão Final - Pregão 44/2025',
    data: '2026-03-13',
    hora: '10:00',
    orgao: 'Prefeitura Jaraguá',
    licitacaoId: '2',
    concluido: false,
    urgente: false
  },
  {
    id: '3',
    tipo: 'entrega',
    titulo: 'Prazo Entrega - Pregão 32/2025',
    data: '2026-03-15',
    hora: '18:00',
    orgao: 'TRE-PE',
    licitacaoId: '3',
    concluido: false,
    urgente: false
  },
  {
    id: '4',
    tipo: 'certidao',
    titulo: 'Renovar CND Federal',
    data: '2026-03-18',
    hora: '09:00',
    orgao: 'Receita Federal',
    licitacaoId: null,
    concluido: false,
    urgente: true
  },
  {
    id: '5',
    tipo: 'pagamento',
    titulo: 'Verificar Pagamento - Pregão 28/2025',
    data: '2026-03-20',
    hora: '09:00',
    orgao: 'Câmara Municipal de Recife',
    licitacaoId: '5',
    concluido: false,
    urgente: false
  },
];

const tipoConfig: Record<string, { label: string; color: string; bg: string }> = {
  sessao: { label: 'Sessão Pública', color: 'text-blue-700', bg: 'bg-blue-100' },
  revisao: { label: 'Revisão', color: 'text-purple-700', bg: 'bg-purple-100' },
  entrega: { label: 'Entrega', color: 'text-amber-700', bg: 'bg-amber-100' },
  certidao: { label: 'Certidão', color: 'text-orange-700', bg: 'bg-orange-100' },
  pagamento: { label: 'Pagamento', color: 'text-green-700', bg: 'bg-green-100' },
};

export default function AgendaPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mesAtual, setMesAtual] = useState(new Date());
  const [visualizacao, setVisualizacao] = useState<'lista' | 'calendario'>('lista');

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

  const hoje = new Date().toISOString().split('T')[0];
  
  const eventosOrdenados = [...eventos].sort((a, b) => 
    new Date(a.data).getTime() - new Date(b.data).getTime()
  );

  const eventosHoje = eventosOrdenados.filter(e => e.data === hoje);
  const eventosProximos = eventosOrdenados.filter(e => e.data > hoje);

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr + 'T00:00:00');
    const hojeDate = new Date();
    hojeDate.setHours(0, 0, 0, 0);
    
    const amanha = new Date(hojeDate);
    amanha.setDate(amanha.getDate() + 1);
    
    if (data.getTime() === hojeDate.getTime()) {
      return 'Hoje';
    } else if (data.getTime() === amanha.getTime()) {
      return 'Amanhã';
    } else {
      return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />
      
      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Agenda</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Acompanhe todos os eventos e prazos
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setVisualizacao('lista')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  visualizacao === 'lista' 
                    ? 'bg-[#2c4a70] text-white' 
                    : 'bg-white text-[#1a2b45] hover:bg-gray-100'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setVisualizacao('calendario')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  visualizacao === 'calendario' 
                    ? 'bg-[#2c4a70] text-white' 
                    : 'bg-white text-[#1a2b45] hover:bg-gray-100'
                }`}
              >
                Calendário
              </button>
            </div>
          </div>

          {visualizacao === 'lista' ? (
            <div className="space-y-6">
              {/* Eventos de Hoje */}
              {eventosHoje.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-[#2c4a70] mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Hoje
                  </h2>
                  <div className="space-y-3">
                    {eventosHoje.map((evento) => (
                      <div 
                        key={evento.id}
                        className={`card p-4 border-l-4 ${evento.urgente ? 'border-red-500' : 'border-[#4674e8]'}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${tipoConfig[evento.tipo].bg} ${tipoConfig[evento.tipo].color}`}>
                                {tipoConfig[evento.tipo].label}
                              </span>
                              {evento.urgente && (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                                  Urgente
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-[#1a2b45]">{evento.titulo}</h3>
                            <p className="text-sm text-[#1a2b45]/60 mt-1">{evento.orgao}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-sm text-[#1a2b45]">
                              <Clock className="w-4 h-4" />
                              {evento.hora}
                            </div>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximos Eventos */}
              <div>
                <h2 className="text-lg font-bold text-[#2c4a70] mb-4 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#4674e8]" />
                  Próximos Eventos
                </h2>
                <div className="space-y-3">
                  {eventosProximos.map((evento) => (
                    <div 
                      key={evento.id}
                      className={`card p-4 border-l-4 ${evento.urgente ? 'border-amber-500' : 'border-gray-200'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${tipoConfig[evento.tipo].bg} ${tipoConfig[evento.tipo].color}`}>
                              {tipoConfig[evento.tipo].label}
                            </span>
                          </div>
                          <h3 className="font-bold text-[#1a2b45]">{evento.titulo}</h3>
                          <p className="text-sm text-[#1a2b45]/60 mt-1">{evento.orgao}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#2c4a70]">{formatarData(evento.data)}</p>
                            <p className="text-xs text-[#1a2b45]/60">{evento.hora}</p>
                          </div>
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <CheckCircle className="w-5 h-5 text-gray-300 hover:text-green-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Visualização Calendário */
            <div className="card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setMesAtual(new Date(mesAtual.setMonth(mesAtual.getMonth() - 1)))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-[#2c4a70]">
                  {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
                <button 
                  onClick={() => setMesAtual(new Date(mesAtual.setMonth(mesAtual.getMonth() + 1)))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                  <div key={dia} className="text-xs font-bold text-[#1a2b45]/60 py-2">
                    {dia}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }, (_, i) => {
                  const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
                  const dia = i - primeiroDia.getDay() + 1;
                  const dataAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia);
                  const dataStr = dataAtual.toISOString().split('T')[0];
                  const eventosData = eventos.filter(e => e.data === dataStr);
                  const ehHoje = dataStr === hoje;
                  const ehMesAtual = dataAtual.getMonth() === mesAtual.getMonth();
                  
                  return (
                    <div 
                      key={i}
                      className={`min-h-[60px] sm:min-h-[80px] p-1 rounded-lg border ${
                        ehHoje ? 'bg-[#4674e8]/10 border-[#4674e8]' :
                        ehMesAtual ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-50'
                      }`}
                    >
                      <span className={`text-xs font-bold ${
                        ehHoje ? 'text-[#4674e8]' :
                        ehMesAtual ? 'text-[#1a2b45]' : 'text-[#1a2b45]/30'
                      }`}>
                        {dia > 0 && dia <= new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate() ? dia : ''}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {eventosData.slice(0, 2).map(e => (
                          <div 
                            key={e.id}
                            className={`text-[10px] px-1 py-0.5 rounded truncate ${tipoConfig[e.tipo].bg} ${tipoConfig[e.tipo].color}`}
                          >
                            {e.titulo.substring(0, 15)}...
                          </div>
                        ))}
                        {eventosData.length > 2 && (
                          <span className="text-[10px] text-[#1a2b45]/60">+{eventosData.length - 2} mais</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
