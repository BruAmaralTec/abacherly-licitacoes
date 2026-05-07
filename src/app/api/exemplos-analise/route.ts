import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, exigir, serializar, desserializar } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico', 'adm_geral', 'analista');
    const snap = await adminDb().collection('exemplos_analise').orderBy('criadoEm', 'desc').get();
    return snap.docs.map((d) => serializar({ id: d.id, ...d.data() }));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico');
    const body = desserializar(await req.json());
    const doc = await adminDb().collection('exemplos_analise').add({
      ...body,
      enviadoPor: user.uid,
      criadoEm: Timestamp.now(),
    });
    return { id: doc.id };
  });
}
