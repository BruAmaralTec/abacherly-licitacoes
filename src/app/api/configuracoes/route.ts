import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, exigir, serializar, desserializar } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT = { retencaoMesesAgente: 6 };

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const snap = await adminDb().collection('configuracoes').doc('sistema').get();
    if (!snap.exists) return DEFAULT;
    return serializar(snap.data());
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico');
    const body = desserializar(await req.json());
    await adminDb().collection('configuracoes').doc('sistema').set({
      ...body,
      atualizadoEm: Timestamp.now(),
      atualizadoPor: user.uid,
    }, { merge: true });
    return { ok: true };
  });
}
