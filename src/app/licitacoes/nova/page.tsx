'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  DollarSign,
  CheckCircle,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { PageSkeleton } from '@/components/Skeleton';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { criarLicitacao } from '@/lib/services/licitacoes';
import { criarEvento } from '@/lib/services/eventos';
import { processarSolicitacao } from '@/lib/services/solicitacoes';
import { listarClientes } from '@/lib/services/clientes';
import { ClienteInfo, Modalidade } from '@/lib/types';

const MODALIDADES: Modalidade[] = [
  'Pregão Eletrônico',
  'Pregão Presencial',
  'Concorrência',
  'Tomada de Preços',
  'Convite',
  'Dispensa',
  'Inexigibilidade',
];

export default function NovaLicitacaoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-[#f8fafc]">
        <Sidebar />
        <div className="w-full lg:pl-64 min-h-screen flex flex-col">
          <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
            <PageSkeleton />
          </main>
        </div>
      </div>
    }>
      <NovaLicitacaoContent />
    </Suspense>
  );
}

function NovaLicitacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, loading, isAdmin, isEquipe } = useAuth();

  const solicitacaoId = searchParams.get('solicitacaoId') || '';

  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [clienteId, setClienteId] = useState<string>(userProfile?.clientId || '');
  const [form, setForm] = useState({
    numero: searchParams.get('numero') || '',
    codigoConlicitacao: '',
    uasg: searchParams.get('uasg') || '',
    objeto: '',
    orgao: '',
    modalidade: 'Pregão Eletrônico' as string,
    valorEstimado: '',
    dataCertame: '',
    horaCertame: '',
    prazoEntrega: '',
    localEntrega: '',
    resumo: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isEquipe) {
      router.push('/dashboard');
    }
  }, [user, loading, router, isEquipe]);

  useEffect(() => {
    async function carregarClientes() {
      if (!isAdmin) return;
      try {
        const lista = await listarClientes();
        setClientes(lista);
        if (!clienteId && lista.length === 1 && lista[0].id) {
          setClienteId(lista[0].id);
        }
      } catch (e) {
        console.error('Erro listando clientes:', e);
      }
    }
    if (userProfile) carregarClientes();
  }, [userProfile, isAdmin]);

  function atualizar<K extends keyof typeof form>(campo: K, valor: typeof form[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleSalvar() {
    setErro('');
    if (!clienteId) {
      setErro('Selecione o cliente.');
      return;
    }
    if (!form.numero.trim() || !form.objeto.trim() || !form.orgao.trim()) {
      setErro('Preencha número, objeto e órgão (obrigatórios).');
      return;
    }
    if (!user) return;

    setSalvando(true);
    try {
      const dataCertame = form.dataCertame ? new Date(form.dataCertame) : new Date();

      const licitacaoId = await criarLicitacao({
        numero: form.numero.trim(),
        objeto: form.objeto.trim(),
        orgao: form.orgao.trim(),
        modalidade: form.modalidade,
        valorEstimado: parseFloat(form.valorEstimado) || 0,
        dataCertame: Timestamp.fromDate(dataCertame),
        horaCertame: form.horaCertame || '',
        prazoEntrega: form.prazoEntrega || '',
        localEntrega: form.localEntrega || '',
        status: 'em_analise',
        resumoIA: form.resumo || '',
        codigoPNCP: '',
        urlConlicitacao: '',
        clientId: clienteId,
        criadoPor: user.uid,
      });

      // Evento de sessão pública
      if (form.dataCertame && form.horaCertame) {
        const [hora, minuto] = form.horaCertame.split(':');
        const dt = new Date(form.dataCertame);
        dt.setHours(parseInt(hora || '0'), parseInt(minuto || '0'));
        await criarEvento({
          titulo: `Sessão Pública - ${form.numero}`,
          descricao: `${form.modalidade} - ${form.orgao}`,
          tipo: 'sessao_publica',
          dataHora: Timestamp.fromDate(dt),
          licitacaoId,
          licitacaoNumero: form.numero,
          urgente: false,
          concluido: false,
          clientId: clienteId,
          criadoPor: user.uid,
        });
      }

      if (solicitacaoId) {
        await processarSolicitacao(solicitacaoId, user.uid, licitacaoId);
      }

      router.push(`/licitacoes/${licitacaoId}/analise`);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao salvar licitação');
    } finally {
      setSalvando(false);
    }
  }

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
          <div className="flex items-center gap-4 mb-6">
            <Link href="/equipe/licitacoes" className="p-2 hover:bg-white rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#1a2b45]" />
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Nova Licitação</h1>
              <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
                Cadastre manualmente ou use o Agente IA para extrair dos arquivos do edital.
              </p>
            </div>
          </div>

          {/* Sugestão Agente IA */}
          <div className="card p-4 mb-6 border-l-4 border-[#4674e8] bg-[#4674e8]/5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#4674e8] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-[#2c4a70]">Tem o PDF do edital?</p>
                <p className="text-sm text-[#1a2b45]/70">
                  O Agente IA extrai os dados automaticamente e já preenche tudo, incluindo a análise técnica.
                </p>
              </div>
              <Link
                href="/equipe/agente-analise"
                className="btn-primary text-sm flex items-center gap-2 flex-shrink-0"
              >
                Usar Agente IA
              </Link>
            </div>
          </div>

          {/* Formulário manual */}
          <div className="card p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-bold text-[#2c4a70] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4674e8]" />
              Cadastro Manual
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isAdmin && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#1a2b45] mb-1">Cliente *</label>
                  <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full">
                    <option value="">Selecione...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razaoSocial || c.nomeFantasia || c.cnpj}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Número do Edital *</label>
                <input
                  type="text"
                  value={form.numero}
                  onChange={(e) => atualizar('numero', e.target.value)}
                  placeholder="Ex: 65/2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Cód. Conlicitação</label>
                <input
                  type="text"
                  value={form.codigoConlicitacao}
                  onChange={(e) => atualizar('codigoConlicitacao', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">UASG</label>
                <input
                  type="text"
                  value={form.uasg}
                  onChange={(e) => atualizar('uasg', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Modalidade</label>
                <select value={form.modalidade} onChange={(e) => atualizar('modalidade', e.target.value)}>
                  {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1a2b45] mb-1 flex items-center gap-1">
                  <Building2 className="w-4 h-4" /> Órgão *
                </label>
                <input
                  type="text"
                  value={form.orgao}
                  onChange={(e) => atualizar('orgao', e.target.value)}
                  placeholder="Nome do órgão licitante"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Objeto *</label>
                <textarea
                  value={form.objeto}
                  onChange={(e) => atualizar('objeto', e.target.value)}
                  rows={3}
                  placeholder="Descrição do objeto da licitação"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.valorEstimado}
                  onChange={(e) => atualizar('valorEstimado', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Data do Certame
                </label>
                <input
                  type="date"
                  value={form.dataCertame}
                  onChange={(e) => atualizar('dataCertame', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Hora do Certame</label>
                <input
                  type="time"
                  value={form.horaCertame}
                  onChange={(e) => atualizar('horaCertame', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Prazo de Entrega</label>
                <input
                  type="text"
                  value={form.prazoEntrega}
                  onChange={(e) => atualizar('prazoEntrega', e.target.value)}
                  placeholder="Ex: 30 dias após assinatura"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Local de Entrega</label>
                <input
                  type="text"
                  value={form.localEntrega}
                  onChange={(e) => atualizar('localEntrega', e.target.value)}
                  placeholder="Endereço ou cidade"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1a2b45] mb-1">Resumo (opcional)</label>
                <textarea
                  value={form.resumo}
                  onChange={(e) => atualizar('resumo', e.target.value)}
                  rows={2}
                  placeholder="Resumo curto do objetivo da licitação"
                />
              </div>
            </div>

            {erro && (
              <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {erro}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Link href="/equipe/licitacoes" className="btn-secondary text-center">Cancelar</Link>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {salvando ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</>
              ) : (
                <><CheckCircle className="w-5 h-5" /> Salvar Licitação</>
              )}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
