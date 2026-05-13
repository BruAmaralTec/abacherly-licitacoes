import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import { Licitacao, AnaliseEdital } from '@/lib/types';

const COR_PRIMARIA = '2c4a70';
const COR_ACCENT = 'd64b16';
const COR_BRANCO = 'FFFFFF';

function campoResumo(label: string, valor: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 3000, type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label, bold: true, size: 20, color: COR_PRIMARIA, font: 'Calibri' }),
            ],
          }),
        ],
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: valor || '—', size: 20, font: 'Calibri' }),
            ],
          }),
        ],
      }),
    ],
  });
}

function secao(titulo: string, conteudo: string, corTitulo: string = COR_PRIMARIA): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: titulo, bold: true, size: 22, color: corTitulo, font: 'Calibri' }),
      ],
      spacing: { before: 300, after: 100 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COR_ACCENT },
      },
    }),
  ];

  if (conteudo) {
    conteudo.split('\n').forEach((linha) => {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: linha, size: 20, font: 'Calibri' })],
          spacing: { after: 60 },
        })
      );
    });
  } else {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: '', size: 20, font: 'Calibri' })],
        spacing: { after: 200 },
      })
    );
  }

  return paragraphs;
}

/** Seção opcional — só renderiza se houver conteúdo (evita seções vazias no Word). */
function secaoOpcional(titulo: string, conteudo: string | undefined, corTitulo?: string): Paragraph[] {
  if (!conteudo?.trim()) return [];
  return secao(titulo, conteudo, corTitulo);
}

/**
 * Helper para checar se um bloco deve aparecer no Word:
 * só aparece se o analista marcou Conferido E Enviar no doc cliente.
 */
function podeEnviar(analise: AnaliseEdital, blocoId: string): boolean {
  const f = analise.flagsExport?.[blocoId];
  return !!(f?.conferido && f?.enviar);
}

/** Versão de secao que respeita flagsExport. */
function secaoFiltrada(
  blocoId: string,
  analise: AnaliseEdital,
  titulo: string,
  conteudo: string | undefined,
  corTitulo?: string
): Paragraph[] {
  if (!podeEnviar(analise, blocoId)) return [];
  if (!conteudo?.trim()) return [];
  return secao(titulo, conteudo, corTitulo);
}

export async function exportarAnaliseWord(licitacao: Licitacao, analise: AnaliseEdital) {
  const dataCertame = licitacao.dataCertame?.toDate();
  const dataCertameStr = dataCertame
    ? `${dataCertame.toLocaleDateString('pt-BR')} ${licitacao.horaCertame || dataCertame.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  const valorStr = licitacao.valorEstimado
    ? licitacao.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '';

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children: [
          // ===== CABEÇALHO =====
          new Paragraph({
            children: [
              new TextRun({
                text: 'ANÁLISE DO EDITAL',
                bold: true,
                size: 32,
                color: COR_PRIMARIA,
                font: 'Calibri',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Nº Conlicitação ', size: 22, color: '666666', font: 'Calibri' }),
              new TextRun({
                text: licitacao.numeroControlePNCP || licitacao.codigoPNCP || '—',
                bold: true,
                size: 22,
                font: 'Calibri',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 3, color: COR_ACCENT },
            },
          }),

          // ===== TÍTULO DO EDITAL =====
          new Paragraph({
            children: [
              new TextRun({
                text: `EDITAL ${(licitacao.modalidade || '').toUpperCase()} Nº ${licitacao.numero}${licitacao.srp ? ' SISTEMA DE REGISTRO DE PREÇOS' : ''}`,
                bold: true,
                size: 24,
                color: COR_BRANCO,
                font: 'Calibri',
              }),
            ],
            alignment: AlignmentType.CENTER,
            shading: { type: ShadingType.SOLID, color: COR_PRIMARIA },
            spacing: { before: 200, after: 50 },
          }),
          ...(licitacao.processo
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Processo Administrativo nº: ${licitacao.processo}`,
                      size: 20,
                      color: COR_BRANCO,
                      font: 'Calibri',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  shading: { type: ShadingType.SOLID, color: COR_PRIMARIA },
                  spacing: { after: 200 },
                }),
              ]
            : []),

          // ===== RESUMO (só se Conferido + Enviar marcados para o bloco "resumo") =====
          ...(podeEnviar(analise, 'resumo')
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'RESUMO - CONDIÇÕES DE PARTICIPAÇÃO E FORNECIMENTO',
                      bold: true,
                      size: 22,
                      color: COR_PRIMARIA,
                      font: 'Calibri',
                    }),
                  ],
                  spacing: { before: 300, after: 200 },
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COR_ACCENT },
                  },
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    campoResumo('Objeto:', analise.objeto || licitacao.objeto),
                    campoResumo('Órgão:', analise.orgao || licitacao.orgao),
                    campoResumo('Data do Certame:', analise.dataCertame || dataCertameStr),
                    campoResumo('Fuso Horário:', analise.fusoHorario || ''),
                    campoResumo('Modalidade:', analise.modalidade || licitacao.modalidade || ''),
                    campoResumo('Base Legal:', analise.baseLegal || licitacao.baseLegal || ''),
                    campoResumo('Enquadramento:', analise.enquadramentoEmpresa || ''),
                    campoResumo('Valor:', `${analise.valor || valorStr}    Intervalo de Lance: ${analise.valorIntervaloLance || ''}`),
                    campoResumo('Formalização:', analise.formalizacao || (licitacao.srp ? 'Ata de Registro de Preços' : '')),
                    campoResumo('Portal:', analise.portal || ''),
                    campoResumo('Critério de Julgamento:', analise.criterioJulgamento || ''),
                    campoResumo('Modo de Disputa:', analise.modoDisputa || licitacao.modoDisputa || ''),
                    campoResumo('Data Limite Cadastramento:', analise.dataLimiteCadastramento || ''),
                    campoResumo('Prazo de Entrega:', analise.prazoEntrega || licitacao.prazoEntrega || ''),
                    campoResumo('Garantia de Contrato:', analise.garantiaContrato || ''),
                    campoResumo('Validade da Proposta:', analise.validadeProposta || ''),
                    campoResumo('Vigência Total Contrato:', analise.vigenciaTotalContrato || ''),
                    campoResumo('Pagamento:', analise.pagamento || ''),
                    ...(analise.contratacaoMaoObra ? [campoResumo('Contratação de Mão de Obra:', analise.contratacaoMaoObra)] : []),
                    ...(analise.remotoOuPresencial ? [campoResumo('Remoto ou Presencial:', analise.remotoOuPresencial)] : []),
                    ...(analise.dedicacaoExclusivaPerfis ? [campoResumo('Dedicação Exclusiva:', analise.dedicacaoExclusivaPerfis)] : []),
                    campoResumo('Recurso:', analise.recurso || ''),
                    campoResumo('Proposta Adequada:', analise.propostaAdequada || ''),
                    campoResumo('Prazo p/ Assinatura do Contrato:', analise.prazoAssinaturaContrato || analise.assinaturaContrato || ''),
                  ],
                }),
              ]
            : []),

          // ===== ATENÇÕES (vermelho, antes de DOCUMENTAÇÃO) =====
          ...secaoFiltrada('atencoes', analise, 'ATENÇÃO — RISCOS E PONTOS CRÍTICOS', analise.atencoes, 'C0392B'),

          // ===== SEÇÕES DETALHADAS — ordem padrão Abächerly =====
          ...secaoFiltrada('documentacao', analise, 'DOCUMENTAÇÃO', analise.documentacao),
          ...secaoFiltrada('amostra', analise, 'AMOSTRA', analise.amostra),
          ...secaoFiltrada('vistoria', analise, 'VISTORIA', analise.vistoria),
          ...secaoFiltrada('garantia_contrato', analise, 'GARANTIA DE CONTRATO', analise.garantiaContratoDetalhe || analise.garantiaDeContrato),
          ...secaoFiltrada('prova_conceito', analise, 'PROVA DE CONCEITO', analise.provaDeConceito),
          ...secaoFiltrada('proposta', analise, 'PROPOSTA', analise.proposta),
          ...secaoFiltrada('proposta_revisada', analise, 'PROPOSTA REVISADA', analise.propostaRevisada),
          ...secaoFiltrada('julgamento_proposta', analise, 'JULGAMENTO DA PROPOSTA', analise.julgamentoProposta),
          ...secaoFiltrada('habilitacao_juridica', analise, 'HABILITAÇÃO JURÍDICA', analise.habilitacaoJuridica),
          ...secaoFiltrada('regularidade_fiscal', analise, 'REGULARIDADE FISCAL E TRABALHISTA', analise.regularidadeFiscal),
          ...secaoFiltrada('qualificacao_economica', analise, 'QUALIFICAÇÃO ECONÔMICA FINANCEIRA', analise.qualificacaoEconomica),
          ...secaoFiltrada('qualificacao_tecnica', analise, 'QUALIFICAÇÃO TÉCNICA', analise.qualificacaoTecnica),
          ...secaoFiltrada('declaracoes', analise, 'DECLARAÇÕES', analise.declaracoes),
          ...secaoFiltrada('declarado_vencedor', analise, 'DECLARADO VENCEDOR / ASSINATURA DO CONTRATO', analise.declaradoVencedor),
          ...secaoFiltrada('faturamento_entrega', analise, 'DO FATURAMENTO / ENTREGA DO SERVIÇO', analise.faturamentoEntrega),
          ...secaoFiltrada('prazos', analise, 'PRAZOS', analise.prazos),
          ...secaoFiltrada('observacoes', analise, 'OBSERVAÇÕES', analise.observacoes),

          // ===== RODAPÉ =====
          new Paragraph({
            children: [
              new TextRun({
                text: 'Em caso de dúvidas consultar o edital e seus anexos, este resumo não exime a leitura total dos documentos oficiais da presente licitação.',
                italics: true,
                size: 18,
                color: '888888',
                font: 'Calibri',
              }),
            ],
            spacing: { before: 400 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 3, color: COR_ACCENT },
            },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Itu, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                size: 20,
                color: '666666',
                font: 'Calibri',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Atenciosamente,', bold: true, size: 20, color: COR_PRIMARIA, font: 'Calibri' }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Érika Abächerly', size: 20, color: COR_PRIMARIA, font: 'Calibri' }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const nomeArquivo = `Analise_Edital_${licitacao.numero.replace(/\//g, '-')}.docx`;
  saveAs(blob, nomeArquivo);
}
