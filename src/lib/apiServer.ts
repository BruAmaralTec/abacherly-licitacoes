/**
 * Helpers server-side para API routes — validação de token e role checking.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export type UserRole = 'adm_tecnico' | 'adm_geral' | 'analista' | 'cliente'
                     | 'super_admin' | 'admin' | 'operator';

export interface AuthedUser {
  uid: string;
  email: string;
  role: UserRole;
  clientId?: string;
}

const ROLE_MAP: Record<string, UserRole> = {
  super_admin: 'adm_tecnico',
  admin: 'adm_geral',
  operator: 'analista',
};

export function normalizarRole(role?: string): UserRole {
  if (!role) return 'analista';
  return (ROLE_MAP[role] ?? role) as UserRole;
}

export function isAdmTecnico(r?: string) {
  return normalizarRole(r) === 'adm_tecnico';
}
export function isAdmGeral(r?: string) {
  return normalizarRole(r) === 'adm_geral';
}
export function isAnalista(r?: string) {
  return normalizarRole(r) === 'analista';
}
export function isCliente(r?: string) {
  return normalizarRole(r) === 'cliente';
}
export function isAdmin(r?: string) {
  return isAdmTecnico(r) || isAdmGeral(r);
}
export function isEquipe(r?: string) {
  return isAdmin(r) || isAnalista(r);
}

/**
 * Extrai e valida o ID Token. Retorna user com role. Joga 401 se inválido.
 */
export async function autenticar(req: NextRequest): Promise<AuthedUser> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const decoded = await adminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  const email = decoded.email || '';

  const snap = await adminDb().collection('users').doc(uid).get();
  if (!snap.exists) {
    return { uid, email, role: 'analista' };
  }
  const data = snap.data() || {};
  return {
    uid,
    email,
    role: normalizarRole(data.role),
    clientId: data.clientId,
  };
}

/**
 * Garante que o user tem um dos roles permitidos.
 */
export function exigir(user: AuthedUser, ...permitidos: UserRole[]): void {
  const role = normalizarRole(user.role);
  if (!permitidos.includes(role)) {
    throw NextResponse.json({ error: `Permissão negada (necessário: ${permitidos.join(', ')})` }, { status: 403 });
  }
}

/**
 * Wrapper para handlers — converte exceções NextResponse em respostas.
 */
export async function withAuth<T>(
  req: NextRequest,
  handler: (user: AuthedUser) => Promise<T>
): Promise<NextResponse> {
  try {
    const user = await autenticar(req);
    const result = await handler(user);
    if (result instanceof NextResponse) return result;
    if (result === undefined || result === null) return new NextResponse(null, { status: 204 });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    console.error('[api] erro:', e);
    return NextResponse.json(
      { error: (e as Error)?.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

/**
 * Converte Timestamp do Firestore (admin) para string ISO.
 * Faz isso recursivamente em objetos/arrays.
 */
export function serializar(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  // Timestamp do firebase-admin
  if (typeof value.toDate === 'function' && typeof value.seconds === 'number') {
    return { _seconds: value.seconds, _nanoseconds: value.nanoseconds || 0 };
  }
  if (Array.isArray(value)) return value.map(serializar);
  const out: any = {};
  for (const [k, v] of Object.entries(value)) out[k] = serializar(v);
  return out;
}

/**
 * Converte de volta — strings ISO em Timestamp aceitos pelo Firestore admin.
 */
export function desserializar(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (typeof value._seconds === 'number') {
    const { Timestamp } = require('firebase-admin/firestore');
    return Timestamp.fromMillis(value._seconds * 1000 + (value._nanoseconds || 0) / 1e6);
  }
  if (Array.isArray(value)) return value.map(desserializar);
  const out: any = {};
  for (const [k, v] of Object.entries(value)) out[k] = desserializar(v);
  return out;
}
