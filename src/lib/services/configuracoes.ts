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

export const MODELOS_GEMINI_SUGERIDOS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (recomendado — rápido + multimodal)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (mais inteligente, mais lento/caro)' },
  { value: 'gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (geração anterior)' },
  { value: 'gemini-1.5-pro-002', label: 'Gemini 1.5 Pro (estável — fallback)' },
  { value: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash (estável — mais rápido)' },
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
