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
//
// Modelos preview (3.x) podem retornar 404 "Publisher Model was not found or
// your project does not have access to it" — requerem allowlist no GCP. Em
// produção use 2.5-flash (default) ou 2.5-pro.
export const MODELOS_GEMINI_SUGERIDOS = [
  // Geração 2.5 (estável GA — recomendado para produção)
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (recomendado — estável, rápido, multimodal)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (estável — mais inteligente, mais lento/caro)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (estável — escala/baixa latência)' },

  // Geração 3 (preview com allowlist — projetos GCP precisam de acesso prévio)
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro (preview — requer allowlist GCP)' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash (preview — requer allowlist GCP)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (preview — requer allowlist GCP)' },
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
