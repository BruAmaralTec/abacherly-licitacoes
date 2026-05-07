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

    let query: FirebaseFirestore.Query = adminDb().collection('relatorios');
    if (isCliente(user.role)) {
      if (!user.clientId) return [];
      query = query.where('clientId', '==', user.clientId).where('liberadoParaCliente', '==', true);
    } else if (clientIdParam) {
      query = query.where('clientId', '==', clientIdParam);
    }
    query = query.orderBy('criadoEm', 'desc').limit(500);

    const snap = await query.get();
    return snap.docs.map((d) => serializar({ id: d.id, ...d.data() }));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    const body = desserializar(await req.json());
    const doc = await adminDb().collection('relatorios').add({
      ...body,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
      criadoPor: user.uid,
    });
    return { id: doc.id };
  });
}
