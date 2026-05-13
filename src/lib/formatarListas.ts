/**
 * Formatador de listas para o texto vindo do agente IA.
 *
 * O Gemini frequentemente retorna texto corrido contendo listas como:
 *   "...documentos exigidos: a) certidão...; b) atestado...; c) declaração..."
 *
 * Esta função detecta marcadores clássicos e insere `\n\n` antes de cada item
 * para que o `whitespace-pre-wrap` no front renderize em parágrafos.
 *
 * Marcadores reconhecidos:
 *   - a) b) c) ... z)
 *   - 1) 2) ... 99)
 *   - 1.1, 1.1.1, 1.2.3, etc.
 *   - I. II. III. IV. (romanos maiúsculos seguidos de ponto ou parêntese)
 *   - • (bullet)
 *
 * Cuidados (não quebra):
 *   - Não insere quebra se já há `\n` imediatamente antes do marcador.
 *   - Não confunde "Lei nº 14.133/2021" ou "5.3.5" no início de frase.
 *   - Conservativo: prefere deixar passar do que quebrar texto válido.
 */
export function formatarListas(texto: string | undefined | null): string {
  if (!texto) return '';

  let out = texto;

  // 1) Marcadores com letra minúscula em parênteses: " a) " → "\n\na) "
  //    Só quando vier após espaço/ponto/vírgula/ponto-e-vírgula (não meio de palavra).
  out = out.replace(/([.;,]\s+|\s{2,})([a-z]\)\s)/g, '\n\n$2');

  // 2) Marcadores numerados em parênteses: " 1) ", " 12) "
  out = out.replace(/([.;,]\s+|\s{2,})(\d{1,2}\)\s)/g, '\n\n$2');

  // 3) Marcadores numerados com ponto: " 1.1 ", " 1.1.1 "
  //    Exige pelo menos 2 níveis (1.1, 1.2.3) para evitar quebrar "5.3.5" no meio
  //    de uma frase única. Vem após espaço seguido de letra maiúscula no item.
  out = out.replace(/([.;]\s+)(\d+\.\d+(?:\.\d+)*\s+(?=[A-ZÀ-Ü]))/g, '\n\n$2');

  // 4) Romanos maiúsculos: " I. ", " II) ", " III. "
  out = out.replace(/([.;,]\s+)([IVX]{1,4}[.)]\s+(?=[A-ZÀ-Ü]))/g, '\n\n$2');

  // 5) Bullets:  • item   ou   - item   no meio de texto contínuo
  out = out.replace(/\s+([•·]\s)/g, '\n\n$1');

  // 6) Compactar 3+ \n consecutivos para 2 (parágrafo separado, não bloco)
  out = out.replace(/\n{3,}/g, '\n\n');

  return out;
}

/**
 * Aplica o formatador em todos os campos de texto longo de AnaliseEdital.
 * Usado uma vez ao carregar a análise — o resultado é gravado no state
 * e persistido se o analista clicar em Salvar.
 */
export function formatarAnaliseListas<T extends object>(analise: T): T {
  if (!analise) return analise;
  // Lista dos campos longos onde aplica
  const CAMPOS = [
    'atencoes',
    'documentacao',
    'qualificacaoTecnica',
    'qualificacaoEconomica',
    'habilitacaoJuridica',
    'regularidadeFiscal',
    'declaracoes',
    'declaradoVencedor',
    'faturamentoEntrega',
    'proposta',
    'propostaRevisada',
    'julgamentoProposta',
    'provaDeConceito',
    'amostra',
    'vistoria',
    'garantiaContratoDetalhe',
    'garantiaDeContrato',
    'prazos',
    'observacoes',
    'contratacaoMaoObra',
    'remotoOuPresencial',
    'dedicacaoExclusivaPerfis',
    'enquadramentoEmpresa',
  ];
  const out = { ...analise } as Record<string, unknown>;
  for (const k of CAMPOS) {
    const v = out[k];
    if (typeof v === 'string') {
      out[k] = formatarListas(v);
    }
  }
  return out as T;
}
