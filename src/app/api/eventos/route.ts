import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, serializar, desserializar, isCliente } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    const url = new URL(req.url);
    const clientIdParam = url.searchParams.get('clientId') || undefined;
    const proximosDias = parseInt(url.searchParams.get('proximosDias') || '0', 10);
    const mes = url.searchParams.get('mes'); // YYYY-MM

    let query: FirebaseFirestore.Query = adminDb().collection('eventos');

    const clientId = isCliente(user.role) ? user.clientId : clientIdParam;
    if (clientId) query = query.where('clientId', '==', clientId);

    if (proximosDias > 0) {
      const agora = Timestamp.now();
      const fim = Timestamp.fromMillis(Date.now() + proximosDias * 24 * 60 * 60 * 1000);
      query = query.where('dataHora', '>=', agora).where('dataHora', '<=', fim);
    }

    if (mes) {
      const [ano, m] = mes.split('-').map(Number);
      const inicio = Timestamp.fromDate(new Date(ano, m - 1, 1));
      const fim = Timestamp.fromDate(new Date(ano, m, 1));
      query = query.where('dataHora', '>=', inicio).where('dataHora', '<', fim);
    }

    query = query.orderBy('dataHora', 'asc').limit(200);
    const snap = await query.get();
    return snap.docs.map((d) => serializar({ id: d.id, ...d.data() }));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    const body = desserializar(await req.json());
    if (isCliente(user.role)) body.clientId = user.clientId;
    const doc = await adminDb().collection('eventos').add({
      ...body,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
      criadoPor: user.uid,
    });
    return { id: doc.id };
  });
}
