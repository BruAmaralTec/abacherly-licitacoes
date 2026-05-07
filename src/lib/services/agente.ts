/**
 * Cliente do serviço agent (Cloud Run) para análise IA de editais.
 *
 * URL configurável via NEXT_PUBLIC_AGENT_URL — apontando para o Cloud Run.
 * Em dev, pode apontar para http://localhost:8080.
 */

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8080';

export interface AnaliseResponse {
  analise_id: string;
  licitacao_id?: string | null;
  status: 'processando' | 'concluida' | 'erro';
  extracao?: {
    numero?: string;
    codigo_conlicitacao?: string;
    uasg?: string;
    orgao?: string;
    modalidade?: string;
    objeto?: string;
    objeto_resumido?: string;
    valor_estimado?: number;
    data_certame?: string;
    hora_certame?: string;
    prazo_entrega?: string;
    local_entrega?: string;
    analise?: Record<string, string>;
  } | null;
  erro?: string | null;
}

export async function enviarParaAnalise(params: {
  arquivos: File[];
  clientId: string;
  criadoPor: string;
}): Promise<AnaliseResponse> {
  const form = new FormData();
  form.append('client_id', params.clientId);
  form.append('criado_por', params.criadoPor);
  for (const f of params.arquivos) {
    form.append('arquivos', f, f.name);
  }

  const res = await fetch(`${AGENT_URL}/analise`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Erro ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function buscarStatusAnalise(analiseId: string): Promise<AnaliseResponse> {
  const res = await fetch(`${AGENT_URL}/analise/${analiseId}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Análise não encontrada');
    throw new Error(`Erro ${res.status}`);
  }
  return res.json();
}

/** Polls until status != processando, timeout 5min default */
export async function aguardarAnalise(
  analiseId: string,
  opts: { intervaloMs?: number; timeoutMs?: number } = {}
): Promise<AnaliseResponse> {
  const intervalo = opts.intervaloMs ?? 3000;
  const timeout = opts.timeoutMs ?? 5 * 60 * 1000;
  const inicio = Date.now();

  while (Date.now() - inicio < timeout) {
    const r = await buscarStatusAnalise(analiseId);
    if (r.status !== 'processando') return r;
    await new Promise((res) => setTimeout(res, intervalo));
  }
  throw new Error('Timeout ao aguardar análise');
}
