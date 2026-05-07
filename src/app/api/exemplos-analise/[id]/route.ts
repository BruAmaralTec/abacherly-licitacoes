import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { withAuth, exigir } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico');
    await adminDb().collection('exemplos_analise').doc(params.id).delete();
    return null;
  });
}
