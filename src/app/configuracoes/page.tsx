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
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { PageSkeleton } from '@/components/Skeleton';
import Footer from '@/components/Footer';
import {
  buscarConfig,
  salvarConfig,
  ConfigSistema,
  MODELO_GEMINI_DEFAULT,
  MODELOS_GEMINI_SUGERIDOS,
} from '@/lib/services/configuracoes';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { user, userProfile, loading, isAdmTecnico } = useAuth();

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

  const [agente, setAgente] = useState<ConfigSistema>({
    retencaoMesesAgente: 6,
    agentUrl: '',
    modeloGemini: MODELO_GEMINI_DEFAULT,
  });
  const [modeloCustom, setModeloCustom] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    // Apenas Adm. Geral pode acessar
    if (!loading && user && !isAdmTecnico) {
      router.push('/dashboard');
    }
  }, [user, loading, router, isAdmTecnico]);

  useEffect(() => {
    if (!user) return;
    buscarConfig().then(setAgente).catch(console.error);
  }, [user]);

  if (loading || !user || !isAdmTecnico) {
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

  const handleSave = async () => {
    if (!userProfile) return;
    setSalvando(true);
    setFeedback('');
    try {
      await salvarConfig(
        {
          retencaoMesesAgente: Number(agente.retencaoMesesAgente) || 6,
          agentUrl: agente.agentUrl || '',
          modeloGemini: (agente.modeloGemini || MODELO_GEMINI_DEFAULT).trim(),
        },
        userProfile.uid
      );
      setFeedback('✓ Configurações salvas');
      setTimeout(() => setFeedback(''), 3000);
    } catch (e: any) {
      setFeedback('Erro: ' + (e?.message || 'falha ao salvar'));
    } finally {
      setSalvando(false);
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
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Configurações</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Configure o comportamento do sistema
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={salvando}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

          {feedback && (
            <div className={`p-3 rounded-lg mb-4 text-sm ${
              feedback.startsWith('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {feedback}
            </div>
          )}

          <div className="space-y-6">
            {/* Agente de Análise IA */}
            <div className="card p-4 sm:p-6 border-l-4 border-[#4674e8]">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#4674e8]" />
                <h2 className="text-lg font-bold text-[#2c4a70]">Agente de Análise (IA)</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="font-medium text-[#1a2b45] block mb-1">
                    Modelo do Gemini
                  </label>
                  <p className="text-xs text-[#1a2b45]/60 mb-2">
                    Modelo usado pelo agente IA na análise de editais e extração de cartão CNPJ.
                    Padrão: <code>{MODELO_GEMINI_DEFAULT}</code>. Mudanças entram em vigor na próxima
                    chamada (sem redeploy).
                  </p>

                  {!modeloCustom ? (
                    <select
                      value={
                        MODELOS_GEMINI_SUGERIDOS.some((m) => m.value === agente.modeloGemini)
                          ? agente.modeloGemini
                          : '__custom__'
                      }
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setModeloCustom(true);
                        } else {
                          setAgente({ ...agente, modeloGemini: e.target.value });
                        }
                      }}
                      className="w-full max-w-xl"
                    >
                      {MODELOS_GEMINI_SUGERIDOS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                      <option value="__custom__">— Outro modelo (digitar nome) —</option>
                    </select>
                  ) : (
                    <div className="flex gap-2 max-w-xl">
                      <input
                        type="text"
                        value={agente.modeloGemini || ''}
                        onChange={(e) => setAgente({ ...agente, modeloGemini: e.target.value })}
                        placeholder="ex: gemini-3.0-flash"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setModeloCustom(false);
                          setAgente({ ...agente, modeloGemini: MODELO_GEMINI_DEFAULT });
                        }}
                        className="btn-secondary text-sm px-3"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="font-medium text-[#1a2b45] block mb-1">
                    Retenção de arquivos (meses)
                  </label>
                  <p className="text-xs text-[#1a2b45]/60 mb-2">
                    Quanto tempo os arquivos enviados ao agente ficam guardados no Cloud Storage.
                    Padrão: 6 meses. A política de lifecycle do bucket reflete este valor automaticamente.
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={agente.retencaoMesesAgente}
                    onChange={(e) => setAgente({ ...agente, retencaoMesesAgente: Number(e.target.value) })}
                    className="max-w-[120px]"
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="font-medium text-[#1a2b45] block mb-1">
                    URL do serviço (Cloud Run)
                  </label>
                  <p className="text-xs text-[#1a2b45]/60 mb-2">
                    Endpoint do agente Python. Configurado também via variável <code>NEXT_PUBLIC_AGENT_URL</code>.
                    Use este campo apenas para override em runtime (dev/staging).
                  </p>
                  <input
                    type="url"
                    placeholder="https://abacherly-agent-xxx.run.app"
                    value={agente.agentUrl || ''}
                    onChange={(e) => setAgente({ ...agente, agentUrl: e.target.value })}
                  />
                </div>
              </div>
            </div>

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
