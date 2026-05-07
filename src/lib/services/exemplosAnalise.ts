/**
 * Exemplos de análise (treinamento do agente IA).
 * Firestore via API route. Storage via SDK direto.
 */
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { api } from '@/lib/apiClient';
import { Timestamp } from 'firebase/firestore';

const STORAGE_PATH = 'agente-treinamento';

export interface ExemploAnalise {
  id?: string;
  nome: string;
  descricao?: string;
  arquivoUrl: string;
  arquivoPath: string;
  tamanhoBytes: number;
  mimeType: string;
  enviadoPor: string;
  enviadoPorNome?: string;
  criadoEm: Timestamp;
}

export async function listarExemplos(): Promise<ExemploAnalise[]> {
  return api.get<ExemploAnalise[]>('/api/exemplos-analise');
}

export async function uploadExemplo(
  file: File,
  enviadoPor: string,
  enviadoPorNome: string,
  descricao: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${STORAGE_PATH}/${ts}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  const task = uploadBytesResumable(storageRef, file);
  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => onProgress?.(((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
      (error) => reject(error),
      () => resolve()
    );
  });

  const arquivoUrl = await getDownloadURL(task.snapshot.ref);

  const r = await api.post<{ id: string }>('/api/exemplos-analise', {
    nome: file.name,
    descricao: descricao || '',
    arquivoUrl,
    arquivoPath: storagePath,
    tamanhoBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
    enviadoPorNome,
  });
  return r.id;
}

export async function excluirExemplo(exemplo: ExemploAnalise): Promise<void> {
  if (exemplo.arquivoPath) {
    try {
      await deleteObject(ref(storage, exemplo.arquivoPath));
    } catch {}
  }
  if (exemplo.id) {
    await api.delete(`/api/exemplos-analise/${exemplo.id}`);
  }
}
