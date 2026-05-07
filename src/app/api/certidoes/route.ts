import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, serializar, desserializar, isCliente } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CERTIDAO_NOMES: Record<string, string> = {
  cnd_federal: 'CND Federal',
  fgts: 'CRF/FGTS',
  cndt: 'CNDT Trabalhista',
  estadual: 'CND Estadual',
  municipal: 'CND Municipal',
  falencia: 'Certidão de Falência',
};

const CERTIDAO_PORTAIS: Record<string, string> = {
  cnd_federal: 'https://solucoes.receita.fazenda.gov.br/Servicos/CertidaoInternet/PJ/Emitir',
  fgts: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf',
  cndt: 'https://www.tst.jus.br/certidao1',
  estadual: '',
  municipal: '',
  falencia: '',
};

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    const url = new URL(req.url);
    const clientIdParam = url.searchParams.get('clientId');
    const all = url.searchParams.get('all') === 'true';

    let query: FirebaseFirestore.Query = adminDb().collection('certidoes');

    if (isCliente(user.role)) {
      if (!user.clientId) return [];
      query = query.where('clientId', '==', user.clientId).orderBy('tipo', 'asc');
    } else if (clientIdParam) {
      query = query.where('clientId', '==', clientIdParam).orderBy('tipo', 'asc');
    } else if (all) {
      query = query.orderBy('atualizadoEm', 'desc');
    }

    const snap = await query.get();
    return snap.docs.map((d) => serializar({ id: d.id, ...d.data() }));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    const body = desserializar(await req.json());
    const op = body.op;

    // op: 'init' inicializa as 6 certidoes padrao para um cliente
    if (op === 'init') {
      const clientId = body.clientId;
      if (!clientId) throw new Error('clientId obrigatório');
      const tipos = ['cnd_federal', 'fgts', 'cndt', 'estadual', 'municipal', 'falencia'];
      const batch = adminDb().batch();
      for (const tipo of tipos) {
        const ref = adminDb().collection('certidoes').doc(`${clientId}_${tipo}`);
        batch.set(ref, {
          tipo,
          nome: CERTIDAO_NOMES[tipo],
          status: 'pendente',
          dataEmissao: null,
          dataValidade: null,
          diasRestantes: 0,
          urlPortal: CERTIDAO_PORTAIS[tipo],
          arquivoUrl: '',
          clientId,
          atualizadoEm: Timestamp.now(),
        });
      }
      await batch.commit();
      return { ok: true };
    }

    // create direto
    if (isCliente(user.role)) body.clientId = user.clientId;
    const doc = await adminDb().collection('certidoes').add({
      ...body,
      atualizadoEm: Timestamp.now(),
    });
    return { id: doc.id };
  });
}
