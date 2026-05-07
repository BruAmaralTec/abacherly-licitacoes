/**
 * Service para "exemplos_analise" — arquivos-padrão que o agente IA usa como
 * few-shot reference ao analisar editais.
 *
 * Cada exemplo tem: nome, descrição, arquivo no Storage, criado por/em.
 * O agente Python lê esses arquivos do GCS e injeta no prompt do Gemini.
 */
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

const COLLECTION = 'exemplos_analise';
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
  const q = query(collection(db, COLLECTION), orderBy('criadoEm', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExemploAnalise));
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
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(percent);
      },
      (error) => reject(error),
      () => resolve()
    );
  });

  const arquivoUrl = await getDownloadURL(task.snapshot.ref);

  const docRef = await addDoc(collection(db, COLLECTION), {
    nome: file.name,
    descricao: descricao || '',
    arquivoUrl,
    arquivoPath: storagePath,
    tamanhoBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
    enviadoPor,
    enviadoPorNome,
    criadoEm: Timestamp.now(),
  });
  return docRef.id;
}

export async function excluirExemplo(exemplo: ExemploAnalise): Promise<void> {
  if (exemplo.arquivoPath) {
    try {
      await deleteObject(ref(storage, exemplo.arquivoPath));
    } catch {
      /* arquivo pode já ter sido removido */
    }
  }
  if (exemplo.id) {
    await deleteDoc(doc(db, COLLECTION, exemplo.id));
  }
}
