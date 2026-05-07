import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { withAuth, exigir, serializar, desserializar } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    if (user.uid !== params.id) {
      exigir(user, 'adm_tecnico', 'adm_geral');
    }
    const snap = await adminDb().collection('users').doc(params.id).get();
    if (!snap.exists) return null;
    return serializar({ id: snap.id, ...snap.data() });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico', 'adm_geral');
    const body = desserializar(await req.json());
    const { name, role, clientId, password } = body;

    const update: any = {};
    if (name !== undefined) update.name = name;
    if (role !== undefined) update.role = role;
    if (clientId !== undefined) update.clientId = clientId;
    if (Object.keys(update).length > 0) {
      await adminDb().collection('users').doc(params.id).update(update);
    }

    if (password) {
      await adminAuth().updateUser(params.id, { password });
    }

    return { id: params.id };
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico');
    await adminDb().collection('users').doc(params.id).delete();
    try { await adminAuth().deleteUser(params.id); } catch {}
    return null;
  });
}
