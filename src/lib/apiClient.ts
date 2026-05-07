/**
 * Cliente HTTP para API routes do Next.js (server-side proxy ao Firestore).
 * Sempre injeta o Firebase ID Token no Authorization header.
 *
 * Também faz deserialização recursiva de Timestamps:
 * { _seconds, _nanoseconds } -> Timestamp do firebase/firestore (com .toDate()).
 */
import { Timestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase';

function deserializeTimestamps(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (typeof value._seconds === 'number' && '_nanoseconds' in value) {
    return new Timestamp(value._seconds, value._nanoseconds || 0);
  }
  if (Array.isArray(value)) return value.map(deserializeTimestamps);
  const out: any = {};
  for (const [k, v] of Object.entries(value)) out[k] = deserializeTimestamps(v);
  return out;
}

function serializeTimestamps(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (value instanceof Timestamp) {
    return { _seconds: value.seconds, _nanoseconds: value.nanoseconds };
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return { _seconds: Math.floor(ms / 1000), _nanoseconds: (ms % 1000) * 1e6 };
  }
  if (Array.isArray(value)) return value.map(serializeTimestamps);
  const out: any = {};
  for (const [k, v] of Object.entries(value)) out[k] = serializeTimestamps(v);
  return out;
}

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');
  return user.getIdToken();
}

async function fazerFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...init, headers, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return deserializeTimestamps(json) as T;
}

function bodyJson(body: any): string | undefined {
  if (body === undefined || body === null) return undefined;
  return JSON.stringify(serializeTimestamps(body));
}

export const api = {
  get: <T>(path: string) => fazerFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: any) =>
    fazerFetch<T>(path, { method: 'POST', body: bodyJson(body) }),
  patch: <T>(path: string, body?: any) =>
    fazerFetch<T>(path, { method: 'PATCH', body: bodyJson(body) }),
  put: <T>(path: string, body?: any) =>
    fazerFetch<T>(path, { method: 'PUT', body: bodyJson(body) }),
  delete: (path: string) => fazerFetch<void>(path, { method: 'DELETE' }),
};
