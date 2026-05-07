import { NextRequest, NextResponse } from 'next/server';
import { withAuth, exigir } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const AGENT_URL = (process.env.NEXT_PUBLIC_AGENT_URL || '').trim()
  || 'https://abacherly-agent-1036949086437.us-central1.run.app';

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico', 'adm_geral');

    const incoming = await req.formData();
    const arquivo = incoming.get('arquivo');
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: 'arquivo é obrigatório' }, { status: 400 });
    }

    const fwd = new FormData();
    fwd.append('arquivo', arquivo, arquivo.name);

    const r = await fetch(`${AGENT_URL}/extrair-cnpj`, {
      method: 'POST',
      body: fwd,
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return NextResponse.json(
        { error: `Agente respondeu ${r.status}: ${txt.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await r.json();
    return data;
  });
}
