import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

const ROLE_MAP: Record<string, string> = {
  super_admin: 'adm_tecnico',
  admin: 'adm_geral',
  operator: 'analista',
};

function normalizarRole(role?: string): string {
  if (!role) return 'analista';
  return ROLE_MAP[role] ?? role;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = await adminAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email || '';

    const db = adminDb();
    let snap = await db.collection('users').doc(uid).get();
    let data: any = snap.exists ? snap.data() : null;

    // Auto-cura: busca por email se doc por uid não existir
    if (!data && email) {
      const result = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!result.empty) {
        const legacy = result.docs[0];
        data = legacy.data();
        await db.collection('users').doc(uid).set({
          ...data,
          role: normalizarRole(data.role),
          lastLogin: new Date(),
        });
        if (legacy.id !== uid) {
          await legacy.ref.delete().catch(() => {});
        }
      }
    }

    if (!data) {
      // Profile vazio (fallback minimo)
      return NextResponse.json({
        uid,
        email,
        name: email.split('@')[0] || 'Usuário',
        role: 'analista',
      });
    }

    return NextResponse.json({
      uid,
      email,
      name: data.name || 'Usuário',
      role: normalizarRole(data.role),
      clientId: data.clientId || undefined,
    });
  } catch (err: any) {
    console.error('[api/profile] erro:', err?.message || err);
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
  }
}
