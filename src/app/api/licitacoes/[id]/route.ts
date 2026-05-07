import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, exigir, serializar, desserializar, isCliente } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    const snap = await adminDb().collection('licitacoes').doc(params.id).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    if (isCliente(user.role) && data.clientId !== user.clientId) throw new Error('Permissão negada');
    return serializar({ id: snap.id, ...data });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    const body = desserializar(await req.json());
    await adminDb().collection('licitacoes').doc(params.id).update({
      ...body,
      atualizadoEm: Timestamp.now(),
    });
    return { id: params.id };
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico', 'adm_geral');
    await adminDb().collection('licitacoes').doc(params.id).delete();
    return null;
  });
}
