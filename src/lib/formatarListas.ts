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

  // Normaliza caracteres invisíveis e \r\n antes de aplicar regex.
  // NBSP (U+00A0), zero-width spaces e narrow no-break space viram espaço comum.
  let out = texto
    .replace(/\r\n/g, '\n')
    .replace(/[  ]/g, ' ')
    .replace(/[​‌‍﻿]/g, '');

  // 0) Referências (NomeArquivo, pg. X) — REGRA AGRESSIVA: qualquer parênteses
  //    que contém um nome.ext (pdf/docx/xlsx/pptx/odt/ods/odp/txt/html/csv/rtf)
  //    em algum lugar tem todo o whitespace interno colapsado para 1 espaço.
  //    Cobre casos:
  //      "(Edital.pdf,\n  pg. 5)"        → "(Edital.pdf, pg. 5)"
  //      "(Edital.pdf, pg\n50)"          → "(Edital.pdf, pg 50)"
  //      "(Edital.pdf,\npgs. 5-7)"       → "(Edital.pdf, pgs. 5-7)"
  //      "(Edital.pdf, página\n12)"      → "(Edital.pdf, página 12)"
  //      "(Termo de Referência.pdf,\n  p. 4)" → "(Termo de Referência.pdf, p. 4)"
  //    NOTA: usamos [^()] (sem excluir \n) para casar parênteses multi-linha.
  out = out.replace(
    /\(\s*([^()]*?\.(?:pdf|docx?|xlsx?|pptx?|odt|ods|odp|txt|html?|csv|rtf)[^()]*?)\s*\)/gi,
    (match, interior: string) => {
      // Colapsa qualquer sequência de whitespace para um único espaço.
      const limpo = interior.replace(/\s+/g, ' ').trim();
      // Compacta vírgula colada: "Edital.pdf,pg" → "Edital.pdf, pg"
      const normalizado = limpo.replace(/,(\S)/g, ', $1');
      return `(${normalizado})`;
    }
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
 * Frase padrão inserida em campos vazios das abas Edital e Objeto.
 * A exportação (Word/PDF) filtra qualquer texto que contenha esta frase.
 */
export const FRASE_VAZIO_EXPORT =
  'Não possui informações localizadas será retirado da exportação';

export function contemFraseVazio(v: string | undefined | null): boolean {
  if (!v) return false;
  return v.includes('Não possui informações localizadas');
}

/**
 * Marca campos VAZIOS das abas Edital (RESUMO) e Objeto com a frase padrão
 * informativa. A exportação filtra essas linhas via contemFraseVazio.
 *
 * O segundo argumento `licitacao` (opcional) é usado para fallback — só
 * marcamos como vazio se NEM analise nem a licitação base têm o valor.
 */
export function marcarVaziosEditalObjeto<T extends object>(
  analise: T,
  licitacao?: { orgao?: string; objeto?: string; modalidade?: string; prazoEntrega?: string; baseLegal?: string; modoDisputa?: string }
): T {
  const out = { ...analise } as Record<string, unknown>;

  // Campos do RESUMO (aba Edital) — texto livre vazio é marcado.
  // dataCertame fica de fora: vem do Licitacao.dataCertame (Timestamp) via fallback no JSX.
  const CAMPOS_EDITAL_RESUMO = [
    'fusoHorario',
    'validadeProposta',
    'criterioJulgamento',
    'modoDisputa',
    'baseLegal',
    'portal',
    'valor',
    'valorIntervaloLance',
    'recurso',
    'dataLimiteCredenciamento',
    'dataLimiteCadastramento',
    'dataLimiteEsclarecimentos',
    'propostaAdequada',
    'prazoAssinaturaContrato',
  ];

  // Campos da aba Objeto (após remoção do Órgão).
  const CAMPOS_OBJETO = [
    'vigenciaTotalContrato',
    'formalizacao',
    'pagamento',
    'garantiaContrato',
    'assinaturaContrato',
    'garantiaContratoDetalhe',
    'faturamentoEntrega',
    'prazos',
  ];

  const fallbackLicitacao: Record<string, string | undefined> = {
    modalidade: licitacao?.modalidade,
    baseLegal: licitacao?.baseLegal,
    modoDisputa: licitacao?.modoDisputa,
    objeto: licitacao?.objeto,
    prazoEntrega: licitacao?.prazoEntrega,
  };

  for (const k of [...CAMPOS_EDITAL_RESUMO, ...CAMPOS_OBJETO]) {
    const v = out[k];
    const vTrim = typeof v === 'string' ? v.trim() : '';
    const fb = (fallbackLicitacao[k] || '').trim();
    if (!vTrim && !fb) {
      out[k] = FRASE_VAZIO_EXPORT;
    }
  }

  return out as T;
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
