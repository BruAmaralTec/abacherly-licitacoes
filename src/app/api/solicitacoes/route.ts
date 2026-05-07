import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, serializar, desserializar, isCliente } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    const url = new URL(req.url);
    const clientIdParam = url.searchParams.get('clientId');
    const status = url.searchParams.get('status');

    let query: FirebaseFirestore.Query = adminDb().collection('solicitacoes');
    if (isCliente(user.role)) {
      if (!user.clientId) return [];
      query = query.where('clientId', '==', user.clientId);
    } else if (clientIdParam) {
      query = query.where('clientId', '==', clientIdParam);
    }
    if (status) query = query.where('status', '==', status);
    query = query.orderBy('criadoEm', 'desc').limit(200);

    const snap = await query.get();
    return snap.docs.map((d) => serializar({ id: d.id, ...d.data() }));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    const body = desserializar(await req.json());
    if (isCliente(user.role)) body.clientId = user.clientId;
    const doc = await adminDb().collection('solicitacoes').add({
      ...body,
      status: body.status || 'pendente',
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
      criadoPor: user.uid,
    });
    return { id: doc.id };
  });
}
