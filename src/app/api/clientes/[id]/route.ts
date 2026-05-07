import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, exigir, serializar, desserializar, isCliente } from '@/lib/apiServer';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    if (isCliente(user.role) && user.clientId !== params.id) {
      throw new Error('Permissão negada');
    }
    const snap = await adminDb().collection('clientes').doc(params.id).get();
    if (!snap.exists) return null;
    return serializar({ id: snap.id, ...snap.data() });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    if (isCliente(user.role) && user.clientId !== params.id) {
      throw new Error('Permissão negada');
    }
    const body = desserializar(await req.json());
    await adminDb().collection('clientes').doc(params.id).update({
      ...body,
      atualizadoEm: Timestamp.now(),
      atualizadoPor: user.uid,
    });
    return { id: params.id };
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico');
    await adminDb().collection('clientes').doc(params.id).delete();
    return null;
  });
}
