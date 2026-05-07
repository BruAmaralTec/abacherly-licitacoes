'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building2,
  Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { PageSkeleton } from '@/components/Skeleton';
import { listarTodasCertidoes } from '@/lib/services/certidoes';
import { listarClientes } from '@/lib/services/clientes';
import { Certidao, ClienteInfo, CERTIDAO_NOMES } from '@/lib/types';

export default function EquipeCertidoesPage() {
  const router = useRouter();
  const { user, userProfile, loading, isEquipe } = useAuth();
  const [certidoes, setCertidoes] = useState<Certidao[]>([]);
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && userProfile && !isEquipe) router.push('/dashboard');
  }, [user, userProfile, loading, isEquipe, router]);

  useEffect(() => {
    async function carregar() {
      if (!userProfile) return;
      try {
        const [certs, cls] = await Promise.all([
          listarTodasCertidoes(),
          listarClientes(),
        ]);
        setCertidoes(certs);
        setClientes(cls);
      } catch (e) {
        console.error('Erro carregando certidões:', e);
      } finally {
        setCarregando(false);
      }
    }
    if (userProfile) carregar();
  }, [userProfile]);

  // Agrupa certidões por clientId e ordena clientes alfabeticamente
  const linhasOrdenadas = useMemo(() => {
    const porCliente = new Map<string, Certidao[]>();
    for (const c of certidoes) {
      const arr = porCliente.get(c.clientId) || [];
      arr.push(c);
      porCliente.set(c.clientId, arr);
    }

    const linhas = clientes.map((cli) => ({
      cliente: cli,
      certidoes: (porCliente.get(cli.id || '') || []).sort((a, b) =>
        a.tipo.localeCompare(b.tipo)
      ),
    }));

    const termo = busca.trim().toLowerCase();
    const filtradas = termo
      ? linhas.filter(
          (l) =>
            (l.cliente.razaoSocial || '').toLowerCase().includes(termo) ||
            (l.cliente.nomeFantasia || '').toLowerCase().includes(termo) ||
            (l.cliente.cnpj || '').includes(termo)
        )
      : linhas;

    return filtradas.sort((a, b) =>
      (a.cliente.razaoSocial || '').localeCompare(b.cliente.razaoSocial || '', 'pt-BR')
    );
  }, [clientes, certidoes, busca]);

  function toggleExpandir(clientId: string) {
    setExpandidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(clientId)) novo.delete(clientId);
      else novo.add(clientId);
      return novo;
    });
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
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#2c4a70]">Certidões</h1>
            <p className="text-sm lg:text-base text-[#1a2b45]/60 mt-1">
              Clientes em ordem alfabética. Clique em um cliente para abrir a tela completa com histórico, datas e quem subiu cada certidão.
            </p>
          </div>

          {/* Busca */}
          <div className="card p-3 mb-6 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a2b45]/40" />
            <input
              type="text"
              placeholder="Buscar cliente por razão social, nome fantasia ou CNPJ..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          {carregando ? (
            <div className="card p-8 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-[#4674e8] animate-spin" />
              <span className="text-[#1a2b45]/60">Carregando...</span>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {linhasOrdenadas.length === 0 ? (
                <div className="p-8 text-center text-[#1a2b45]/60">Nenhum cliente encontrado.</div>
              ) : (
                linhasOrdenadas.map(({ cliente, certidoes }) => {
                  const cid = cliente.id || cliente.cnpj;
                  const aberto = expandidos.has(cid);
                  const validas = certidoes.filter((c) => c.status === 'valida').length;
                  const vencendo = certidoes.filter((c) => c.status === 'vencendo').length;
                  const vencidas = certidoes.filter((c) => c.status === 'vencida').length;
                  const pendentes = certidoes.filter((c) => c.status === 'pendente' || !c.dataValidade).length;

                  return (
                    <div key={cid} className="border-b border-gray-100 last:border-b-0">
                      {/* Linha cliente */}
                      <div className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => toggleExpandir(cid)}
                          className="p-1 hover:bg-gray-200 rounded"
                          aria-label={aberto ? 'Recolher' : 'Expandir'}
                        >
                          {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <Building2 className="w-5 h-5 text-[#4674e8] flex-shrink-0" />
                        <Link
                          href={`/equipe/certidoes/${cid}`}
                          className="flex-1 min-w-0 hover:underline"
                        >
                          <p className="font-bold text-[#2c4a70] truncate">
                            {cliente.razaoSocial || cliente.nomeFantasia || cliente.cnpj}
                          </p>
                          <p className="text-xs text-[#1a2b45]/60 truncate">
                            {cliente.cnpj} {cliente.nomeFantasia && cliente.razaoSocial ? `• ${cliente.nomeFantasia}` : ''}
                          </p>
                        </Link>
                        <div className="hidden sm:flex items-center gap-3 text-xs">
                          {validas > 0 && (
                            <span className="flex items-center gap-1 text-green-700">
                              <CheckCircle className="w-3.5 h-3.5" /> {validas}
                            </span>
                          )}
                          {vencendo > 0 && (
                            <span className="flex items-center gap-1 text-amber-700">
                              <AlertTriangle className="w-3.5 h-3.5" /> {vencendo}
                            </span>
                          )}
                          {vencidas > 0 && (
                            <span className="flex items-center gap-1 text-red-700">
                              <AlertTriangle className="w-3.5 h-3.5" /> {vencidas}
                            </span>
                          )}
                          {pendentes > 0 && (
                            <span className="flex items-center gap-1 text-gray-600">
                              <Clock className="w-3.5 h-3.5" /> {pendentes}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Lista resumida de certidões (expandido) */}
                      {aberto && (
                        <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-3 space-y-2">
                          {certidoes.length === 0 ? (
                            <p className="text-xs text-[#1a2b45]/60 italic">Nenhuma certidão cadastrada.</p>
                          ) : (
                            certidoes.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center justify-between gap-3 px-3 py-2 bg-white rounded-lg border border-gray-100 text-sm"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileCheck className="w-4 h-4 text-[#4674e8] flex-shrink-0" />
                                  <span className="truncate">{CERTIDAO_NOMES[c.tipo] || c.tipo}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  {c.dataValidade && (
                                    <span className="text-[#1a2b45]/70">
                                      Val.: {c.dataValidade.toDate().toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                  <StatusBadge status={c.status} />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Certidao['status'] }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    valida: { label: 'Válida', cls: 'bg-green-50 text-green-700' },
    vencendo: { label: 'Vencendo', cls: 'bg-amber-50 text-amber-700' },
    vencida: { label: 'Vencida', cls: 'bg-red-50 text-red-700' },
    pendente: { label: 'Pendente', cls: 'bg-gray-100 text-gray-700' },
  };
  const c = cfg[status] || cfg.pendente;
  return <span className={`px-2 py-0.5 rounded-full font-bold ${c.cls}`}>{c.label}</span>;
}
