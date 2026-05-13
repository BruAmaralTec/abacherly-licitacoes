import { api } from '@/lib/apiClient';
import { Timestamp } from 'firebase/firestore';

export interface ConfigSistema {
  retencaoMesesAgente: number;
  agentUrl?: string;
  modeloGemini?: string;
  atualizadoEm?: Timestamp;
  atualizadoPor?: string;
}

export const MODELO_GEMINI_DEFAULT = 'gemini-2.5-flash';

// Lista atualizada em maio/2026. Apenas modelos da família 2.5 (estáveis GA).
// Modelos 1.5/2.0 estão em retirada. Modelos 3.x estão em preview com allowlist
// no GCP — projeto abacherly-licitacoes não tem acesso, retornam 404. Por isso
// foram removidos desta lista até o Google liberar GA.
export const MODELOS_GEMINI_SUGERIDOS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (recomendado — estável, rápido, multimodal)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (estável — mais inteligente, mais lento/caro)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (estável — escala/baixa latência)' },
];

const DEFAULT: ConfigSistema = {
  retencaoMesesAgente: 6,
  modeloGemini: MODELO_GEMINI_DEFAULT,
};

export async function buscarConfig(): Promise<ConfigSistema> {
  try {
    const data = await api.get<ConfigSistema>('/api/configuracoes');
    return {
      retencaoMesesAgente: data?.retencaoMesesAgente ?? DEFAULT.retencaoMesesAgente,
      agentUrl: data?.agentUrl,
      modeloGemini: data?.modeloGemini || MODELO_GEMINI_DEFAULT,
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
