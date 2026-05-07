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

// Lista atualizada em maio/2026. Manter só >= 2.5; modelos 1.5 e 2.0 estão
// em retirada (Google: gemini-2.0-flash-001 só p/ clientes existentes desde
// 2026-03-06). Atualizar quando o Google lançar novas versões estáveis.
export const MODELOS_GEMINI_SUGERIDOS = [
  // Geração 3 (preview — nem todos os projetos GCP têm acesso liberado)
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro (preview — raciocínio mais avançado, 1M context)' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash (preview — próximo flash, multimodal + agentic)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (preview — mais barato/rápido)' },

  // Geração 2.5 (estável — recomendado para produção)
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
