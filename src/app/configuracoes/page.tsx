'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Bell,
  Calendar,
  Mail,
  Database,
  Shield,
  ExternalLink,
  Save,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { PageSkeleton } from '@/components/Skeleton';
import Footer from '@/components/Footer';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { user, loading, isSuperAdmin } = useAuth();
  
  const [config, setConfig] = useState({
    notificacoes: {
      email: true,
      certidoesVencendo: true,
      diasAntesCertidao: 30,
      pagamentosAtrasados: true,
      diasAtrasoAlerta: 45
    },
    integracao: {
      googleCalendarEnabled: false,
      googleSheetsEnabled: false,
      whatsappEnabled: false
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    // Apenas super_admin pode acessar
    if (!loading && user && !isSuperAdmin) {
      router.push('/dashboard');
    }
  }, [user, loading, router, isSuperAdmin]);

  if (loading || !user || !isSuperAdmin) {
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

  const handleSave = () => {
    alert('Configurações salvas com sucesso!');
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />
      
      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Configurações</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Configure o comportamento do sistema
              </p>
            </div>
            <button 
              onClick={handleSave}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Save className="w-5 h-5" />
              Salvar Alterações
            </button>
          </div>

          <div className="space-y-6">
            {/* Notificações */}
            <div className="card p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-5 h-5 text-[#4674e8]" />
                <h2 className="text-lg font-bold text-[#2c4a70]">Notificações</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-[#1a2b45]">Notificações por Email</p>
                    <p className="text-sm text-[#1a2b45]/60">Receber alertas por email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.notificacoes.email}
                      onChange={(e) => setConfig({
                        ...config,
                        notificacoes: { ...config.notificacoes, email: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4674e8]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4674e8]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-[#1a2b45]">Alertas de Certidões</p>
                    <p className="text-sm text-[#1a2b45]/60">Avisar quando certidões estiverem vencendo</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.notificacoes.certidoesVencendo}
                      onChange={(e) => setConfig({
                        ...config,
                        notificacoes: { ...config.notificacoes, certidoesVencendo: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4674e8]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4674e8]"></div>
                  </label>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-[#1a2b45]">Dias antes do vencimento</p>
                    <span className="text-sm font-bold text-[#4674e8]">{config.notificacoes.diasAntesCertidao} dias</span>
                  </div>
                  <input 
                    type="range"
                    min="7"
                    max="60"
                    value={config.notificacoes.diasAntesCertidao}
                    onChange={(e) => setConfig({
                      ...config,
                      notificacoes: { ...config.notificacoes, diasAntesCertidao: parseInt(e.target.value) }
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-[#1a2b45]">Alertas de Pagamentos</p>
                    <p className="text-sm text-[#1a2b45]/60">Avisar sobre pagamentos atrasados</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.notificacoes.pagamentosAtrasados}
                      onChange={(e) => setConfig({
                        ...config,
                        notificacoes: { ...config.notificacoes, pagamentosAtrasados: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4674e8]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4674e8]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Integrações */}
            <div className="card p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-6">
                <Database className="w-5 h-5 text-[#4674e8]" />
                <h2 className="text-lg font-bold text-[#2c4a70]">Integrações</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-[#1a2b45]">Google Calendar</p>
                      <p className="text-sm text-[#1a2b45]/60">Sincronizar eventos automaticamente</p>
                    </div>
                  </div>
                  <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Conectar
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-sm">S</span>
                    </div>
                    <div>
                      <p className="font-medium text-[#1a2b45]">Google Sheets</p>
                      <p className="text-sm text-[#1a2b45]/60">Exportar dados para planilha</p>
                    </div>
                  </div>
                  <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Conectar
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1a2b45]">WhatsApp (Em breve)</p>
                      <p className="text-sm text-[#1a2b45]/60">Notificações por WhatsApp</p>
                    </div>
                  </div>
                  <span className="text-sm text-[#1a2b45]/40 font-medium">Em desenvolvimento</span>
                </div>
              </div>
            </div>

            {/* Sistema */}
            <div className="card p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-[#4674e8]" />
                <h2 className="text-lg font-bold text-[#2c4a70]">Sistema</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1a2b45]">Versão do Sistema</p>
                      <p className="text-sm text-[#1a2b45]/60">Abächerly Licitações</p>
                    </div>
                    <span className="text-sm font-bold text-[#4674e8]">v1.0.0</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1a2b45]">Banco de Dados</p>
                      <p className="text-sm text-[#1a2b45]/60">Firebase Firestore</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Conectado</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button className="btn-secondary flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Limpar Cache
                  </button>
                  <button className="btn-secondary flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Exportar Dados
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
