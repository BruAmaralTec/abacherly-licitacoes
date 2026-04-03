'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Loader2,
  Save,
  ArrowLeft,
  CheckCircle,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { listarClientes, buscarCliente, salvarCliente } from '@/lib/services/clientes';
import { ClienteInfo, Modalidade } from '@/lib/types';

const MODALIDADES_OPCOES: string[] = [
  'Pregão Eletrônico',
  'Pregão Presencial',
  'Concorrência',
  'Tomada de Preços',
  'Convite',
  'Dispensa',
  'Inexigibilidade',
];

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
];

export default function AdminClientesPage() {
  const router = useRouter();
  const { user, userProfile, loading, isAdmin } = useAuth();

  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteInfo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [novaPalavra, setNovaPalavra] = useState('');
  const [novoDoc, setNovoDoc] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdmin) router.push('/dashboard');
  }, [user, loading, router, isAdmin]);

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await listarClientes();
        setClientes(dados);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      } finally {
        setCarregando(false);
      }
    }
    if (!loading && isAdmin) carregar();
  }, [loading, isAdmin]);

  const handleSalvar = async () => {
    if (!clienteSelecionado?.id || !user) return;
    setSalvando(true);
    setSalvo(false);

    try {
      const { id, ...data } = clienteSelecionado;
      await salvarCliente(id, { ...data, atualizadoPor: user.uid });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);

      // Atualizar lista
      setClientes((prev) =>
        prev.map((c) => (c.id === id ? clienteSelecionado : c))
      );
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSalvando(false);
    }
  };

  const updateField = (campo: string, valor: any) => {
    if (!clienteSelecionado) return;
    setClienteSelecionado({ ...clienteSelecionado, [campo]: valor });
  };

  const toggleModalidade = (mod: string) => {
    if (!clienteSelecionado) return;
    const atual = clienteSelecionado.modalidadesInteresse || [];
    const nova = atual.includes(mod)
      ? atual.filter((m) => m !== mod)
      : [...atual, mod];
    updateField('modalidadesInteresse', nova);
  };

  const toggleUf = (uf: string) => {
    if (!clienteSelecionado) return;
    const atual = clienteSelecionado.ufsInteresse || [];
    const nova = atual.includes(uf)
      ? atual.filter((u) => u !== uf)
      : [...atual, uf];
    updateField('ufsInteresse', nova);
  };

  const adicionarPalavra = () => {
    if (!novaPalavra.trim() || !clienteSelecionado) return;
    const atual = clienteSelecionado.palavrasChaveObjeto || [];
    updateField('palavrasChaveObjeto', [...atual, novaPalavra.trim()]);
    setNovaPalavra('');
  };

  const removerPalavra = (index: number) => {
    if (!clienteSelecionado) return;
    const atual = clienteSelecionado.palavrasChaveObjeto || [];
    updateField('palavrasChaveObjeto', atual.filter((_, i) => i !== index));
  };

  const adicionarDoc = () => {
    if (!novoDoc.trim() || !clienteSelecionado) return;
    const atual = clienteSelecionado.documentosObrigatorios || [];
    updateField('documentosObrigatorios', [...atual, novoDoc.trim()]);
    setNovoDoc('');
  };

  const removerDoc = (index: number) => {
    if (!clienteSelecionado) return;
    const atual = clienteSelecionado.documentosObrigatorios || [];
    updateField('documentosObrigatorios', atual.filter((_, i) => i !== index));
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />

      <div className="w-full lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {clienteSelecionado ? (
            /* ======= Formulário do Cliente ======= */
            <>
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => setClienteSelecionado(null)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[#1a2b45]" />
                </button>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-[#2c4a70]">
                    {clienteSelecionado.razaoSocial || 'Novo Cliente'}
                  </h1>
                  <p className="text-sm text-[#1a2b45]/60">Configurações e regras de análise</p>
                </div>
                <div className="flex items-center gap-2">
                  {salvo && <span className="text-sm text-green-600 font-medium">Salvo!</span>}
                  <button
                    onClick={handleSalvar}
                    disabled={salvando}
                    className="btn-primary flex items-center gap-2"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Dados Cadastrais */}
                <div className="card p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Dados Cadastrais</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a2b45] mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={clienteSelecionado.cnpj || ''}
                        onChange={(e) => updateField('cnpj', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a2b45] mb-1">Razão Social</label>
                      <input
                        type="text"
                        value={clienteSelecionado.razaoSocial || ''}
                        onChange={(e) => updateField('razaoSocial', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a2b45] mb-1">Nome Fantasia</label>
                      <input
                        type="text"
                        value={clienteSelecionado.nomeFantasia || ''}
                        onChange={(e) => updateField('nomeFantasia', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a2b45] mb-1">Porte da Empresa</label>
                      <select
                        value={clienteSelecionado.porteEmpresa || ''}
                        onChange={(e) => updateField('porteEmpresa', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      >
                        <option value="">Selecione</option>
                        <option value="MEI">MEI</option>
                        <option value="ME">ME</option>
                        <option value="EPP">EPP</option>
                        <option value="Medio">Médio</option>
                        <option value="Grande">Grande</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a2b45] mb-1">Telefone</label>
                      <input
                        type="text"
                        value={clienteSelecionado.telefone || ''}
                        onChange={(e) => updateField('telefone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a2b45] mb-1">E-mail de Contato</label>
                      <input
                        type="email"
                        value={clienteSelecionado.emailContato || ''}
                        onChange={(e) => updateField('emailContato', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#1a2b45] mb-1">Endereço</label>
                      <input
                        type="text"
                        value={clienteSelecionado.endereco || ''}
                        onChange={(e) => updateField('endereco', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      />
                    </div>
                  </div>
                </div>

                {/* Modalidades de Interesse */}
                <div className="card p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Modalidades de Interesse</h2>
                  <div className="flex flex-wrap gap-2">
                    {MODALIDADES_OPCOES.map((mod) => {
                      const ativo = (clienteSelecionado.modalidadesInteresse || []).includes(mod);
                      return (
                        <button
                          key={mod}
                          onClick={() => toggleModalidade(mod)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            ativo
                              ? 'bg-[#4674e8] text-white'
                              : 'bg-gray-100 text-[#1a2b45]/70 hover:bg-gray-200'
                          }`}
                        >
                          {ativo && <CheckCircle className="w-3 h-3 inline mr-1" />}
                          {mod}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Regras de Análise */}
                <div className="card p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Regras de Análise</h2>

                  {/* UFs */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#1a2b45] mb-2">UFs de Interesse</label>
                    <div className="flex flex-wrap gap-1">
                      {UFS.map((uf) => {
                        const ativo = (clienteSelecionado.ufsInteresse || []).includes(uf);
                        return (
                          <button
                            key={uf}
                            onClick={() => toggleUf(uf)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              ativo
                                ? 'bg-[#4674e8] text-white'
                                : 'bg-gray-100 text-[#1a2b45]/60 hover:bg-gray-200'
                            }`}
                          >
                            {uf}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a2b45] mb-1">Valor Mínimo (R$)</label>
                      <input
                        type="number"
                        value={clienteSelecionado.valorMinimo || ''}
                        onChange={(e) => updateField('valorMinimo', Number(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a2b45] mb-1">Valor Máximo (R$)</label>
                      <input
                        type="number"
                        value={clienteSelecionado.valorMaximo || ''}
                        onChange={(e) => updateField('valorMaximo', Number(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      />
                    </div>
                  </div>

                  {/* Palavras-chave */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#1a2b45] mb-2">Palavras-chave do Objeto</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={novaPalavra}
                        onChange={(e) => setNovaPalavra(e.target.value)}
                        placeholder="Nova palavra-chave..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                        onKeyDown={(e) => e.key === 'Enter' && adicionarPalavra()}
                      />
                      <button
                        onClick={adicionarPalavra}
                        className="px-3 py-2 bg-[#4674e8] text-white rounded-lg hover:bg-[#3a63d0]"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(clienteSelecionado.palavrasChaveObjeto || []).map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-sm"
                        >
                          {p}
                          <button onClick={() => removerPalavra(i)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Documentos Obrigatórios */}
                <div className="card p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Documentos Obrigatórios</h2>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={novoDoc}
                      onChange={(e) => setNovoDoc(e.target.value)}
                      placeholder="Nome do documento obrigatório..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8]"
                      onKeyDown={(e) => e.key === 'Enter' && adicionarDoc()}
                    />
                    <button
                      onClick={adicionarDoc}
                      className="px-3 py-2 bg-[#4674e8] text-white rounded-lg hover:bg-[#3a63d0]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(clienteSelecionado.documentosObrigatorios || []).map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-200"
                      >
                        <span className="text-sm text-[#1a2b45]">{d}</span>
                        <button onClick={() => removerDoc(i)}>
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div className="card p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-[#2c4a70] mb-4">Observações</h2>
                  <textarea
                    value={clienteSelecionado.observacoes || ''}
                    onChange={(e) => updateField('observacoes', e.target.value)}
                    placeholder="Observações gerais sobre o cliente..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#4674e8] resize-y"
                  />
                </div>
              </div>
            </>
          ) : (
            /* ======= Lista de Clientes ======= */
            <>
              <div className="mb-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">
                  Informações por Cliente
                </h1>
                <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                  Configure regras e dados cadastrais de cada cliente
                </p>
              </div>

              {carregando ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#4674e8]" />
                </div>
              ) : clientes.length === 0 ? (
                <div className="card p-8 text-center text-[#1a2b45]/60">
                  Nenhum cliente cadastrado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setClienteSelecionado(c)}
                      className="card p-4 text-left hover:border-[#4674e8] hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#4674e8] flex items-center justify-center text-white font-bold flex-shrink-0">
                          {c.razaoSocial?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#2c4a70] truncate">{c.razaoSocial}</p>
                          {c.nomeFantasia && (
                            <p className="text-sm text-[#1a2b45]/60 truncate">{c.nomeFantasia}</p>
                          )}
                          <p className="text-xs text-[#1a2b45]/40 mt-1">{c.cnpj}</p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {(c.modalidadesInteresse || []).slice(0, 2).map((m) => (
                              <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                                {m}
                              </span>
                            ))}
                            {(c.modalidadesInteresse || []).length > 2 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                +{(c.modalidadesInteresse || []).length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
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
