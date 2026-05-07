import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, serializar, desserializar, isEquipe, isCliente } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    const url = new URL(req.url);
    const clientIdParam = url.searchParams.get('clientId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const all = url.searchParams.get('all') === 'true';

    let query: FirebaseFirestore.Query = adminDb().collection('licitacoes');

    if (isCliente(user.role)) {
      if (!user.clientId) return [];
      query = query.where('clientId', '==', user.clientId);
    } else if (clientIdParam) {
      query = query.where('clientId', '==', clientIdParam);
    } else if (!all) {
      // Equipe: se não passou clientId nem all, retorna todos (default p/ admin)
    }

    if (status) query = query.where('status', '==', status);
    query = query.orderBy('criadoEm', 'desc').limit(all ? 500 : 100);

    const snap = await query.get();
    return snap.docs.map((d) => serializar({ id: d.id, ...d.data() }));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    const body = desserializar(await req.json());
    if (isCliente(user.role)) {
      body.clientId = user.clientId;
    }
    const doc = await adminDb().collection('licitacoes').add({
      ...body,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
      criadoPor: user.uid,
    });
    return { id: doc.id };
  });
}
