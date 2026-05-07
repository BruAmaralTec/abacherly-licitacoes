/**
 * Service de documentos: usa API routes para Firestore.
 * Upload de arquivos continua via Firebase Storage SDK (HTTP REST, funciona normalmente).
 */
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { api } from '@/lib/apiClient';
import { Documento, DocumentoStatus, TipoDocumento } from '@/lib/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

export function validarArquivo(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return 'Arquivo muito grande. Tamanho máximo: 10MB';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Tipo de arquivo não permitido. Use PDF, PNG ou JPG';
  return null;
}

async function uploadStorage(
  file: File,
  storagePath: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const storageRef = ref(storage, storagePath);
  const task = uploadBytesResumable(storageRef, file);
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => onProgress?.(((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
      (error) => reject(error),
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    );
  });
}

export async function uploadDocumento(
  file: File,
  clientId: string,
  enviadoPor: string,
  tipo: TipoDocumento,
  descricao?: string,
  licitacaoId?: string,
  licitacaoNumero?: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const erro = validarArquivo(file);
  if (erro) throw new Error(erro);

  // 1. Cria doc no Firestore para obter id
  const created = await api.post<{ id: string }>('/api/documentos', {
    nome: file.name,
    descricao: descricao || '',
    tipo,
    arquivoUrl: '',
    arquivoPath: '',
    tamanhoBytes: file.size,
    mimeType: file.type,
    licitacaoId: licitacaoId || '',
    licitacaoNumero: licitacaoNumero || '',
    clientId,
    status: 'enviado' as DocumentoStatus,
  });

  // 2. Sobe arquivo no Storage
  const storagePath = `documentos/${clientId}/${created.id}/${file.name}`;
  const arquivoUrl = await uploadStorage(file, storagePath, onProgress);

  // 3. Atualiza doc com URL
  await api.patch(`/api/documentos/${created.id}`, { arquivoUrl, arquivoPath: storagePath });

  return created.id;
}

export async function buscarDocumento(id: string): Promise<Documento | null> {
  return api.get<Documento | null>(`/api/documentos/${id}`);
}

export async function listarDocumentosPorCliente(clientId: string): Promise<Documento[]> {
  return api.get<Documento[]>(`/api/documentos?clientId=${encodeURIComponent(clientId)}`);
}

export async function listarDocumentosPendentes(): Promise<Documento[]> {
  return api.get<Documento[]>('/api/documentos?status=enviado');
}

export async function listarDocumentosPorLicitacao(licitacaoId: string): Promise<Documento[]> {
  return api.get<Documento[]>(`/api/documentos?licitacaoId=${encodeURIComponent(licitacaoId)}`);
}

export async function validarDocumento(id: string, _adminUid: string): Promise<void> {
  await api.patch(`/api/documentos/${id}`, { status: 'validado' });
}

export async function recusarDocumento(id: string, _adminUid: string, motivo: string): Promise<void> {
  await api.patch(`/api/documentos/${id}`, { status: 'recusado', motivoRecusa: motivo });
}

export async function excluirDocumento(id: string): Promise<void> {
  const documento = await buscarDocumento(id);
  if (!documento) return;
  if (documento.arquivoPath) {
    try {
      await deleteObject(ref(storage, documento.arquivoPath));
    } catch {}
  }
  await api.delete(`/api/documentos/${id}`);
}
