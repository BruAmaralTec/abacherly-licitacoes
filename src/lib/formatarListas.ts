/**
 * Formatador de listas para o texto vindo do agente IA.
 *
 * Quando o Gemini segue o prompt corretamente, já manda subitens indentados:
 *   "7.2.2 Regularidade...\n    a) CNPJ;\n    b) FGTS;\n    c) CNDT."
 *
 * Quando NÃO segue, manda em corrido:
 *   "...documentos exigidos: a) certidão...; b) atestado...; c) declaração..."
 *
 * Este formatador detecta o caso corrido e injeta quebras + indentação.
 * Se já vier formatado, NÃO toca (preserva tabs/espaços do agente).
 */
export function formatarListas(texto: string | undefined | null): string {
  if (!texto) return '';

  let out = texto;

  // 0) Referências (NomeArquivo, pg. X) — colapsa qualquer whitespace interno
  //    (inclusive \n) para um espaço único. Detecta extensões comuns + "pg".
  //    Casos:  "(Edital.pdf,\n  pg. 5)"  →  "(Edital.pdf, pg. 5)"
  //            "(Edital.pdf, pg.\n12)"   →  "(Edital.pdf, pg. 12)"
  //            "(Edital.pdf,\npgs. 5-7)" →  "(Edital.pdf, pgs. 5-7)"
  out = out.replace(
    /\(\s*([^()\n]+?\.(?:pdf|docx?|xlsx?|pptx?|odt|ods|odp|txt|html?|csv|rtf))\s*([,;\s]*)\s*(pgs?\.?)\s*([\d\-,\s]+?)\s*\)/gi,
    (_m, arquivo, _sep, pg, paginas) =>
      `(${arquivo.trim()}, ${pg.replace(/\s+/g, '')} ${paginas.replace(/\s+/g, '')})`
  );

  // 1) Alíneas a) b) c) z) — quando vêm INLINE após ponto/vírgula/dois-pontos +
  //    espaço (NÃO depois de quebra de linha). Insere \n + 4 espaços antes.
  out = out.replace(/([.;,:]\s+)([a-z]\)\s)/g, '\n    $2');

  // 2) Itens numerados em parênteses inline: " 1) ", " 12) ".
  out = out.replace(/([.;,:]\s+)(\d{1,2}\)\s)/g, '\n    $2');

  // 3) Marcadores numerados em ponto (1.1, 1.1.1, 5.3.5) — apenas após ponto
  //    final de frase + espaço, e seguido de letra maiúscula (parágrafo novo).
  //    Aqui usamos \n\n (parágrafo, não subitem).
  out = out.replace(
    /([.;]\s+)(\d+\.\d+(?:\.\d+)*\s+(?=[A-ZÀ-Ü]))/g,
    '\n\n$2'
  );

  // 4) Romanos maiúsculos com ponto/parêntese — também parágrafo novo.
  out = out.replace(
    /([.;,:]\s+)([IVX]{1,4}[.)]\s+(?=[A-ZÀ-Ü]))/g,
    '\n\n$2'
  );

  // 5) Bullets • · inline → quebra + indent.
  out = out.replace(/\s+([•·]\s)/g, '\n    $1');

  // 6) Compactar 3+ \n consecutivos para 2.
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
