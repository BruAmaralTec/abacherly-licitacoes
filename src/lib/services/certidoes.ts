import { Certidao, TipoCertidao, CertidaoStatus, CERTIDAO_NOMES, CERTIDAO_PORTAIS } from '@/lib/types';
import { api } from '@/lib/apiClient';
import { Timestamp } from 'firebase/firestore';

export async function listarCertidoes(clientId: string): Promise<Certidao[]> {
  return api.get<Certidao[]>(`/api/certidoes?clientId=${encodeURIComponent(clientId)}`);
}

export async function listarTodasCertidoes(): Promise<Certidao[]> {
  return api.get<Certidao[]>('/api/certidoes?all=true');
}

export async function atualizarCertidao(id: string, data: Partial<Certidao>): Promise<void> {
  await api.patch(`/api/certidoes/${id}`, data);
}

export async function registrarCertidao(
  clientId: string,
  tipo: TipoCertidao,
  dataEmissao: Date,
  dataValidade: Date,
  arquivoUrl?: string
): Promise<string> {
  const diasRestantes = Math.ceil((dataValidade.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  let status: CertidaoStatus = 'valida';
  if (diasRestantes <= 0) status = 'vencida';
  else if (diasRestantes <= 15) status = 'vencendo';

  const r = await api.post<{ id: string }>('/api/certidoes', {
    tipo,
    nome: CERTIDAO_NOMES[tipo],
    status,
    dataEmissao: Timestamp.fromDate(dataEmissao),
    dataValidade: Timestamp.fromDate(dataValidade),
    diasRestantes,
    urlPortal: CERTIDAO_PORTAIS[tipo],
    arquivoUrl: arquivoUrl || '',
    clientId,
  });
  return r.id;
}

export async function inicializarCertidoes(clientId: string): Promise<void> {
  await api.post('/api/certidoes', { op: 'init', clientId });
}

export async function recalcularStatusCertidoes(clientId: string): Promise<void> {
  const certidoes = await listarCertidoes(clientId);
  for (const cert of certidoes) {
    if (!cert.dataValidade || cert.status === 'pendente') continue;
    const dataVal = cert.dataValidade.toDate();
    const diasRestantes = Math.ceil((dataVal.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    let novoStatus: CertidaoStatus = 'valida';
    if (diasRestantes <= 0) novoStatus = 'vencida';
    else if (diasRestantes <= 15) novoStatus = 'vencendo';
    if (novoStatus !== cert.status || diasRestantes !== cert.diasRestantes) {
      await atualizarCertidao(cert.id!, { status: novoStatus, diasRestantes });
    }
  }
}
