import { api } from '@/lib/apiClient';
import { Timestamp } from 'firebase/firestore';

export interface ConfigSistema {
  retencaoMesesAgente: number;
  agentUrl?: string;
  atualizadoEm?: Timestamp;
  atualizadoPor?: string;
}

const DEFAULT: ConfigSistema = { retencaoMesesAgente: 6 };

export async function buscarConfig(): Promise<ConfigSistema> {
  try {
    const data = await api.get<ConfigSistema>('/api/configuracoes');
    return {
      retencaoMesesAgente: data?.retencaoMesesAgente ?? DEFAULT.retencaoMesesAgente,
      agentUrl: data?.agentUrl,
      atualizadoEm: data?.atualizadoEm,
      atualizadoPor: data?.atualizadoPor,
    };
  } catch {
    return DEFAULT;
  }
}

export async function salvarConfig(
  config: Partial<ConfigSistema>,
  _uid: string
): Promise<void> {
  await api.patch('/api/configuracoes', config);
}
