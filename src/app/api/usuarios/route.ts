import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { withAuth, exigir, serializar, desserializar } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico', 'adm_geral');
    const snap = await adminDb().collection('users').orderBy('name', 'asc').get();
    return snap.docs.map((d) => serializar({ id: d.id, ...d.data() }));
  });
}

/**
 * POST cria usuário no Firebase Auth + doc Firestore (ID = UID).
 * Body: { email, password, name, role, clientId? }
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    exigir(user, 'adm_tecnico', 'adm_geral');
    const body = desserializar(await req.json());
    const { email, password, name, role, clientId } = body;

    if (!email || !password || !name || !role) {
      throw new Error('email, password, name, role obrigatórios');
    }

    let uid: string;
    try {
      const created = await adminAuth().createUser({ email, password, displayName: name });
      uid = created.uid;
    } catch (e: any) {
      if (e?.code === 'auth/email-already-exists') {
        throw new Error('Este e-mail já está em uso');
      }
      if (e?.code === 'auth/weak-password' || e?.code === 'auth/invalid-password') {
        throw new Error('Senha muito fraca (mínimo 6 caracteres)');
      }
      if (e?.code === 'auth/invalid-email') {
        throw new Error('E-mail inválido');
      }
      throw e;
    }

    await adminDb().collection('users').doc(uid).set({
      email,
      name,
      role,
      clientId: clientId || '',
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
    });

    return { uid };
  });
}
