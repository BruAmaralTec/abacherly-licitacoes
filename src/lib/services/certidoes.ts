import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Certidao, TipoCertidao, CertidaoStatus, CERTIDAO_NOMES, CERTIDAO_PORTAIS } from '@/lib/types';

const COLLECTION = 'certidoes';

export async function listarCertidoes(clientId: string): Promise<Certidao[]> {
  const q = query(
    collection(db, COLLECTION),
    where('clientId', '==', clientId),
    orderBy('tipo', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Certidao));
}

export async function atualizarCertidao(
  id: string,
  data: Partial<Certidao>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    atualizadoEm: Timestamp.now(),
  });
}

export async function registrarCertidao(
  clientId: string,
  tipo: TipoCertidao,
  dataEmissao: Date,
  dataValidade: Date,
  arquivoUrl?: string
): Promise<string> {
  const diasRestantes = Math.ceil(
    (dataValidade.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  let status: CertidaoStatus = 'valida';
  if (diasRestantes <= 0) status = 'vencida';
  else if (diasRestantes <= 15) status = 'vencendo';

  const certidao: Omit<Certidao, 'id'> = {
    tipo,
    nome: CERTIDAO_NOMES[tipo],
    status,
    dataEmissao: Timestamp.fromDate(dataEmissao),
    dataValidade: Timestamp.fromDate(dataValidade),
    diasRestantes,
    urlPortal: CERTIDAO_PORTAIS[tipo],
    arquivoUrl: arquivoUrl || '',
    clientId,
    atualizadoEm: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), certidao);
  return docRef.id;
}

/**
 * Inicializa as 6 certidões padrão para um novo cliente
 */
export async function inicializarCertidoes(clientId: string): Promise<void> {
  const tipos: TipoCertidao[] = [
    'cnd_federal', 'fgts', 'cndt', 'estadual', 'municipal', 'falencia'
  ];

  for (const tipo of tipos) {
    const docId = `${clientId}_${tipo}`;
    await setDoc(doc(db, COLLECTION, docId), {
      tipo,
      nome: CERTIDAO_NOMES[tipo],
      status: 'pendente' as CertidaoStatus,
      dataEmissao: null,
      dataValidade: null,
      diasRestantes: 0,
      urlPortal: CERTIDAO_PORTAIS[tipo],
      arquivoUrl: '',
      clientId,
      atualizadoEm: Timestamp.now(),
    });
  }
}

/**
 * Recalcula status de todas as certidões (usar em cron ou ao abrir a página)
 */
export async function recalcularStatusCertidoes(clientId: string): Promise<void> {
  const certidoes = await listarCertidoes(clientId);

  for (const cert of certidoes) {
    if (!cert.dataValidade || cert.status === 'pendente') continue;

    const dataVal = cert.dataValidade.toDate();
    const diasRestantes = Math.ceil(
      (dataVal.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    let novoStatus: CertidaoStatus = 'valida';
    if (diasRestantes <= 0) novoStatus = 'vencida';
    else if (diasRestantes <= 15) novoStatus = 'vencendo';

    if (novoStatus !== cert.status || diasRestantes !== cert.diasRestantes) {
      await atualizarCertidao(cert.id!, { status: novoStatus, diasRestantes });
    }
  }
}
