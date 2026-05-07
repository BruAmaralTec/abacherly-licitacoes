/**
 * Firebase Admin SDK — usado APENAS em API routes server-side.
 * Nunca importar isso em client components.
 *
 * Credenciais via env var FIREBASE_ADMIN_KEY_B64 (JSON da Service Account em base64).
 */
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

let app: App | null = null;

function ensureInitialized(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  const b64 = process.env.FIREBASE_ADMIN_KEY_B64;
  if (!b64) {
    throw new Error('FIREBASE_ADMIN_KEY_B64 não configurado');
  }
  const json = Buffer.from(b64, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(json);

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  return app;
}

export const adminAuth = () => getAdminAuth(ensureInitialized());
export const adminDb = () => getAdminFirestore(ensureInitialized());

/**
 * Verifica o ID Token do Firebase Auth (enviado pelo client) e retorna o uid.
 * Joga erro 401 se inválido.
 */
export async function verificarToken(authHeader: string | null): Promise<{ uid: string; email?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Response('Não autenticado', { status: 401 });
  }
  const token = authHeader.slice(7);
  const decoded = await adminAuth().verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email };
}
