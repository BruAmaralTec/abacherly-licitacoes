import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const DOC_PATH = 'configuracoes/sistema';

export interface ConfigSistema {
  retencaoMesesAgente: number;
  agentUrl?: string;
  atualizadoEm?: Timestamp;
  atualizadoPor?: string;
}

const DEFAULT: ConfigSistema = {
  retencaoMesesAgente: 6,
};

export async function buscarConfig(): Promise<ConfigSistema> {
  const ref = doc(db, DOC_PATH);
  const snap = await getDoc(ref);
  if (!snap.exists()) return DEFAULT;
  const data = snap.data() as Partial<ConfigSistema>;
  return {
    retencaoMesesAgente: data.retencaoMesesAgente ?? DEFAULT.retencaoMesesAgente,
    agentUrl: data.agentUrl,
    atualizadoEm: data.atualizadoEm,
    atualizadoPor: data.atualizadoPor,
  };
}

export async function salvarConfig(
  config: Partial<ConfigSistema>,
  uid: string
): Promise<void> {
  const ref = doc(db, DOC_PATH);
  await setDoc(
    ref,
    {
      ...config,
      atualizadoEm: Timestamp.now(),
      atualizadoPor: uid,
    },
    { merge: true }
  );
}
