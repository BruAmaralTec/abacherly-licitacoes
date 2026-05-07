import { api } from '@/lib/apiClient';
import { Timestamp } from 'firebase/firestore';

export interface UserFirestore {
  id?: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'operator' | 'cliente'
       | 'adm_tecnico' | 'adm_geral' | 'analista';
  clientId?: string;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
}

export async function listarUsuarios(): Promise<UserFirestore[]> {
  return api.get<UserFirestore[]>('/api/usuarios');
}

export async function buscarUsuario(id: string): Promise<UserFirestore | null> {
  return api.get<UserFirestore | null>(`/api/usuarios/${encodeURIComponent(id)}`);
}

export async function criarUsuario(
  email: string,
  password: string,
  name: string,
  role: UserFirestore['role'],
  clientId?: string
): Promise<string> {
  const r = await api.post<{ uid: string }>('/api/usuarios', {
    email,
    password,
    name,
    role,
    clientId,
  });
  return r.uid;
}

export async function atualizarUsuario(
  id: string,
  data: Partial<Pick<UserFirestore, 'name' | 'role' | 'clientId'>> & { password?: string }
): Promise<void> {
  await api.patch(`/api/usuarios/${encodeURIComponent(id)}`, data);
}

export async function excluirUsuario(id: string): Promise<void> {
  await api.delete(`/api/usuarios/${encodeURIComponent(id)}`);
}
