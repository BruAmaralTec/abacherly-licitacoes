import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Documento, DocumentoStatus, TipoDocumento } from '@/lib/types';

const COLLECTION = 'documentos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

export function validarArquivo(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'Arquivo muito grande. Tamanho máximo: 10MB';
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Tipo de arquivo não permitido. Use PDF, PNG ou JPG';
  }
  return null;
}

export function uploadArquivo(
  file: File,
  clientId: string,
  docId: string,
  onProgress?: (percent: number) => void
): { task: UploadTask; promise: Promise<string> } {
  const storagePath = `documentos/${clientId}/${docId}/${file.name}`;
  const storageRef = ref(storage, storagePath);
  const task = uploadBytesResumable(storageRef, file);

  const promise = new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(percent);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });

  return { task, promise };
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

  // Criar doc Firestore primeiro para ter o ID
  const docRef = await addDoc(collection(db, COLLECTION), {
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
    enviadoPor,
    criadoEm: Timestamp.now(),
    atualizadoEm: Timestamp.now(),
  });

  // Upload para Storage
  const storagePath = `documentos/${clientId}/${docRef.id}/${file.name}`;
  const { promise } = uploadArquivo(file, clientId, docRef.id, onProgress);
  const arquivoUrl = await promise;

  // Atualizar doc com URL
  await updateDoc(docRef, {
    arquivoUrl,
    arquivoPath: storagePath,
  });

  return docRef.id;
}

export async function buscarDocumento(id: string): Promise<Documento | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Documento;
}

export async function listarDocumentosPorCliente(clientId: string): Promise<Documento[]> {
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    orderBy('criadoEm', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Documento);
}

export async function listarDocumentosPendentes(): Promise<Documento[]> {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'enviado'),
    orderBy('criadoEm', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Documento);
}

export async function listarDocumentosPorLicitacao(licitacaoId: string): Promise<Documento[]> {
  const q = query(
    collection(db, COLLECTION),
    where('licitacaoId', '==', licitacaoId),
    orderBy('criadoEm', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Documento);
}

export async function validarDocumento(id: string, adminUid: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'validado' as DocumentoStatus,
    validadoPor: adminUid,
    atualizadoEm: Timestamp.now(),
  });
}

export async function recusarDocumento(
  id: string,
  adminUid: string,
  motivo: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'recusado' as DocumentoStatus,
    validadoPor: adminUid,
    motivoRecusa: motivo,
    atualizadoEm: Timestamp.now(),
  });
}

export async function excluirDocumento(id: string): Promise<void> {
  const documento = await buscarDocumento(id);
  if (!documento) return;

  // Deletar do Storage
  if (documento.arquivoPath) {
    try {
      const storageRef = ref(storage, documento.arquivoPath);
      await deleteObject(storageRef);
    } catch {
      // Arquivo pode já ter sido deletado
    }
  }

  // Deletar do Firestore
  await deleteDoc(doc(db, COLLECTION, id));
}
