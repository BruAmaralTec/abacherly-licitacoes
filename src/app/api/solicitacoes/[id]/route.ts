import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, serializar, desserializar } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async () => {
    const snap = await adminDb().collection('solicitacoes').doc(params.id).get();
    if (!snap.exists) return null;
    return serializar({ id: snap.id, ...snap.data() });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async () => {
    const body = desserializar(await req.json());
    await adminDb().collection('solicitacoes').doc(params.id).update({
      ...body,
      atualizadoEm: Timestamp.now(),
    });
    return { id: params.id };
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async () => {
    await adminDb().collection('solicitacoes').doc(params.id).delete();
    return null;
  });
}
