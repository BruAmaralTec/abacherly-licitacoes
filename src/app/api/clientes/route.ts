import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, exigir, serializar, desserializar, isAdmin, isCliente } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    const db = adminDb();
    if (isCliente(user.role) && user.clientId) {
      const snap = await db.collection('clientes').doc(user.clientId).get();
      if (!snap.exists) return [];
      return [serializar({ id: snap.id, ...snap.data() })];
    }
    const snap = await db.collection('clientes').orderBy('razaoSocial', 'asc').get();
    return snap.docs.map((d) => serializar({ id: d.id, ...d.data() }));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico', 'adm_geral');
    const body = desserializar(await req.json());
    const { id, ...data } = body;
    if (!id) throw new Error('id (clientId) obrigatório');
    await adminDb().collection('clientes').doc(id).set({
      ...data,
      atualizadoEm: Timestamp.now(),
      atualizadoPor: user.uid,
    }, { merge: true });
    return { id };
  });
}
