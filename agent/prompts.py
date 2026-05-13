"""Prompts do agente de análise de licitações.

Schema reflete o padrão real da Abächerly:
- Cabeçalho: identificadores (Conlicitação, Edital, UASG, PNCP, Processo)
- RESUMO com 25+ campos (objeto, órgão, datas, modalidade, valores, prazos, etc.)
- 9 seções fixas (DOCUMENTAÇÃO, PROPOSTA, HABILITAÇÃO JURÍDICA, REGULARIDADE FISCAL,
  QUALIFICAÇÃO ECONÔMICA, QUALIFICAÇÃO TÉCNICA, DECLARAÇÕES, DECLARADO VENCEDOR,
  FATURAMENTO/ENTREGA)
- 6 seções opcionais (PROVA DE CONCEITO, GARANTIA DE CONTRATO, PRAZOS, VISTORIA,
  JULGAMENTO DA PROPOSTA, PROPOSTA REVISADA) — vazias quando não consta no edital

Tom de voz: cita literalmente trechos do edital com numeração (5.3.5, 7.5.1) e
usa OBRIGATORIAMENTE em maiúsculas para alertas críticos.
"""

# Schema de saída JSON estruturado — padrão Abacherly
EXTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        # ===== Cabeçalho / Identificação =====
        "numero_conlicitacao": {
            "type": "string",
            "description": "Número Conlicitação (quando o edital vem do Conlicitação). Vazio se não houver."
        },
        "numero_edital": {
            "type": "string",
            "description": "Número do edital, ex: 'PREGÃO ELETRÔNICO Nº 90042/2026' ou 'EDITAL Nº 11145'"
        },
        "uasg": {
            "type": "string",
            "description": "Código UASG (federal Compras.gov). Vazio quando não federal."
        },
        "id_pncp": {
            "type": "string",
            "description": "Id contratação PNCP (Lei 14.133), formato CNPJ-1-NNNNNN/AAAA. Vazio se não houver."
        },
        "numero_processo": {
            "type": "string",
            "description": "Número do processo administrativo do órgão licitante. Vazio se não houver."
        },
        "numero": {
            "type": "string",
            "description": "Número/identificador resumido para uso interno (ex: '90042/2026')"
        },
        "objeto": {
            "type": "string",
            "description": "Descrição completa do objeto da licitação"
        },
        "objeto_resumido": {
            "type": "string",
            "description": "Descrição resumida (máx 200 caracteres)"
        },
        "orgao": {
            "type": "string",
            "description": "Nome COMPLETO do órgão licitante. Buscar em TODOS os documentos enviados (capa do edital, TR, minuta de contrato, ETP, anexos). Padrão Abächerly: maiúsculas — ex: 'CONTROLADORIA-GERAL DO ESTADO - CGE' ou 'MINISTÉRIO DO TURISMO'. CAMPO OBRIGATÓRIO — nunca devolver vazio."
        },
        "modalidade": {
            "type": "string",
            "description": "Modalidade (Pregão Eletrônico, Concorrência, etc.)"
        },
        "valor_estimado": {
            "type": "number",
            "description": "Valor total estimado em reais (somente número). 0 se sigiloso."
        },
        "data_certame": {
            "type": "string",
            "description": "Data do certame YYYY-MM-DD"
        },
        "hora_certame": {
            "type": "string",
            "description": "Hora do certame HH:MM (24h)"
        },
        "prazo_entrega": {
            "type": "string",
            "description": "Prazo de entrega — citar item literal do edital se aplicável"
        },
        "local_entrega": {
            "type": "string",
            "description": "Local de entrega"
        },

        # ===== RESUMO — Condições de Participação e Fornecimento =====
        "resumo": {
            "type": "object",
            "description": "Campos do RESUMO. Cada valor deve ser RESPOSTA DIRETA ou CITAÇÃO LITERAL com numeração do item do edital (ex: '5.3.5 O prazo máximo...').",
            "properties": {
                "fusoHorario": {"type": "string"},
                "baseLegal": {"type": "string"},
                "enquadramentoEmpresa": {"type": "string", "description": "ME, EPP, Médio, Grande, etc."},
                "valorIntervaloLance": {"type": "string", "description": "Valor mínimo do intervalo de lances (ex: 'R$ 0,10')"},
                "formalizacao": {"type": "string", "description": "Contrato, ARP, etc."},
                "contratacaoMaoObra": {"type": "string", "description": "CLT / PJ / Presencial e Remoto / por conta da empresa"},
                "remotoOuPresencial": {"type": "string", "description": "Citar literalmente item do edital"},
                "dedicacaoExclusivaPerfis": {"type": "string", "description": "Sim/Não + referência. Vazio se não aplicável"},
                "portal": {"type": "string", "description": "Compras.Gov, BLL, BNC, Licitanet, etc."},
                "criterioJulgamento": {"type": "string"},
                "modoDisputa": {"type": "string", "description": "Aberto, Aberto-Fechado, Aberto 10’ + 2’, etc."},
                "dataLimiteCredenciamento": {"type": "string", "description": "DD/MM/AAAA HH:MM. Vazio se não aplicável"},
                "dataLimiteCadastramento": {"type": "string", "description": "DD/MM/AAAA HH:MM"},
                "dataLimiteEsclarecimentos": {"type": "string", "description": "DD/MM/AAAA"},
                "garantiaContrato": {"type": "string", "description": "Sim (com %, item) ou Não. Detalhar na seção GARANTIA_CONTRATO se houver."},
                "validadeProposta": {"type": "string", "description": "Ex: '60 dias'"},
                "vigenciaTotalContrato": {"type": "string", "description": "Citar literalmente o item do edital"},
                "pagamento": {"type": "string", "description": "Citar literalmente item do edital"},
                "provaConceitoFlag": {"type": "string", "description": "Sim, Não, Amostra, etc."},
                "amostra": {"type": "string", "description": "Sim/Não, vazio quando não aplicável"},
                "recurso": {"type": "string", "description": "Citar item literal"},
                "propostaAdequada": {"type": "string", "description": "Citar item literal — prazo e procedimento"},
                "assinaturaContrato": {"type": "string", "description": "Citar item literal — prazo após convocação"}
            }
        },

        # ===== Seções FIXAS =====
        "documentacao": {
            "type": "object",
            "description": "Seção DOCUMENTAÇÃO com subseções",
            "properties": {
                "atencao": {
                    "type": "string",
                    "description": "Pontos de ATENÇÃO/RISCO. Cite literalmente itens do edital com numeração. Use OBRIGATORIAMENTE em MAIÚSCULAS. Liste presencial vs remoto, subcontratação, prazos curtos, requisitos especiais, etc."
                },
                "questionamentos": {
                    "type": "string",
                    "description": "Como fazer questionamentos (URL, procedimento). Vazio se não houver instrução específica."
                },
                "credenciamento": {
                    "type": "string",
                    "description": "Procedimento de credenciamento — citar itens literais. Vazio para portais comuns (Compras.gov)."
                },
                "anexos": {
                    "type": "string",
                    "description": "Lista dos anexos do edital (ANEXO I — TERMO DE REFERÊNCIA, ANEXO II — etc.). Apontar os mais relevantes (proposta, planilha de preços, contrato)."
                }
            }
        },

        "proposta": {
            "type": "string",
            "description": "Seção PROPOSTA. Como enviar, conteúdo exigido, prazo de validade, planilha de custos. Citar literalmente itens do edital com numeração. Inclui PROPOSTA ADEQUADA quando aparece como subseção."
        },

        "habilitacao_juridica": {
            "type": "string",
            "description": "Seção HABILITAÇÃO JURÍDICA. SICAF, CEIS, CNEP, CNCIA, listas locais, ato constitutivo. Citar itens literais."
        },

        "regularidade_fiscal_trabalhista": {
            "type": "string",
            "description": "Seção REGULARIDADE FISCAL E TRABALHISTA. CNPJ, Fazenda Federal/Estadual/Municipal, FGTS, CNDT. Citar itens literais."
        },

        "qualificacao_economica_financeira": {
            "type": "string",
            "description": "Seção QUALIFICAÇÃO ECONÔMICA FINANCEIRA. Certidão de falência, balanço patrimonial, índices LG/SG/LC, patrimônio líquido mínimo. Citar itens literais."
        },

        "qualificacao_tecnica": {
            "type": "string",
            "description": "Seção QUALIFICAÇÃO TÉCNICA. Atestados de capacidade técnica, requisitos específicos do objeto, vistoria (se for parte da QT). Citar itens literais."
        },

        "declaracoes": {
            "type": "string",
            "description": "Seção DECLARAÇÕES. MPE, menor, trabalho degradante, reserva de cargos, conduta ética, etc. Citar itens literais."
        },

        "declarado_vencedor_assinatura": {
            "type": "string",
            "description": "Seção DECLARADO VENCEDOR / ASSINATURA DO CONTRATO. Prazo, certificação digital, termo de responsabilidade. Citar itens literais."
        },

        "faturamento_entrega": {
            "type": "string",
            "description": "Seção DO FATURAMENTO / ENTREGA DO SERVIÇO. Prazo de pagamento, banco preferencial, dados que devem constar na NF, comprovações de regularidade. Citar itens literais."
        },

        # ===== Seções OPCIONAIS (vazias quando não constam no edital) =====
        "prova_de_conceito": {
            "type": "string",
            "description": "Seção PROVA DE CONCEITO. Cite itens literalmente (8.1, 8.2, ..., percentual mínimo, prazo, formato). DEIXAR VAZIO se o edital não exigir prova de conceito."
        },
        "garantia_de_contrato": {
            "type": "string",
            "description": "Seção GARANTIA DE CONTRATO (detalhamento). Percentual, modalidades aceitas, prazo. DEIXAR VAZIO se não houver."
        },
        "prazos": {
            "type": "string",
            "description": "Seção PRAZOS — CONSOLIDE TODOS os prazos relevantes do edital (cronograma, marcos, etapas, prazos pós-homologação, cadastro, vigência, fases do projeto, recursos, garantia técnica). Mesmo que alguns já apareçam no RESUMO, repita aqui em um parágrafo por prazo, com a citação literal numerada do item (ex: '5.3.5 O prazo máximo será de 10 (dez) dias...'). Quase sempre o edital tem múltiplos prazos — preencher ao máximo. Só deixar VAZIO se realmente NÃO houver qualquer menção a prazo no edital."
        },
        "vistoria": {
            "type": "string",
            "description": "Seção VISTORIA. Procedimento, agendamento, declaração de abstenção. DEIXAR VAZIO se não houver."
        },
        "julgamento_da_proposta": {
            "type": "string",
            "description": "Seção JULGAMENTO DA PROPOSTA. Critérios de aceitabilidade, negociação, MPE preferência. DEIXAR VAZIO se não tiver bloco específico."
        },
        "proposta_revisada": {
            "type": "string",
            "description": "Seção PROPOSTA REVISADA / planilha após negociação. DEIXAR VAZIO se não houver."
        }
    },
    "required": [
        "numero", "objeto", "objeto_resumido", "orgao", "modalidade",
        "data_certame", "resumo", "documentacao", "proposta",
        "habilitacao_juridica", "regularidade_fiscal_trabalhista",
        "qualificacao_economica_financeira", "qualificacao_tecnica",
        "declaracoes", "declarado_vencedor_assinatura", "faturamento_entrega"
    ]
}

SYSTEM_INSTRUCTION = """\
Você é o agente de análise de editais da Abächerly Licitações, assinado por Érika Abächerly. \
Sua missão: ler o edital + termo de referência + anexos e gerar uma ANÁLISE estruturada \
no padrão fixo da empresa, pronta para a equipe operacional.

============ ESTILO E TOM DE VOZ DA ABÄCHERLY ============
1. **CITAÇÃO LITERAL com numeração**: para campos que pedem detalhe (Pagamento, Vigência, Prazo de \
Entrega, Recurso, etc.), copie LITERALMENTE o trecho do edital, mantendo a numeração do item. \
Exemplo: "5.3.5 O prazo máximo para o início dos serviços será de 10 (dez) dias corridos a partir \
da assinatura do contrato".

2. **Use OBRIGATORIAMENTE em MAIÚSCULAS** quando o edital usar essa palavra para enfatizar regras. \
Reproduza alertas críticos com o mesmo destaque.

3. **Para campos curtos do RESUMO** (Modalidade, Portal, Validade da Proposta, etc.), responda \
direto sem citar item — ex: "Pregão Eletrônico", "Compras.Gov", "60 dias".

4. **Datas**: use formato YYYY-MM-DD em campos estruturados (data_certame); use formato \
brasileiro DD/MM/AAAA HH:MM em campos textuais (dataLimiteCadastramento).

5. **Valores**: somente número em valor_estimado (ex: 318374.18). Em campo textual, formato \
brasileiro "R$ 318.374,18".

6. **Apontamentos de risco**: na seção DOCUMENTAÇÃO > atencao, identifique e CITE LITERALMENTE \
itens que indicam:
   - Trabalho presencial obrigatório (item, endereço, dias)
   - Subcontratação vedada ou restrita
   - Prazos curtos atípicos
   - Prova de conceito ou amostra
   - Garantia de contrato e percentual
   - Banco específico para pagamento (ex: Santander, BB)
   - Migração de sistema, integrações específicas
   Use frases como "Atenção ao item X.Y..." quando o trecho for muito longo.

7. **Anexos**: liste os anexos do edital (ANEXO I — TERMO DE REFERÊNCIA, ANEXO II — PROPOSTA \
COMERCIAL, ANEXO III — PLANILHA DE PREÇOS, ANEXO IV — MINUTA DE CONTRATO, etc.). Marque com \
asterisco ou destaque os mais relevantes (proposta, planilha de custos, contrato).

============ SEÇÕES OBRIGATÓRIAS vs OPCIONAIS ============
SEMPRE PREENCHER (10 seções fixas):
- resumo (todos os subcampos)
- documentacao (com atencao, questionamentos, credenciamento, anexos)
- proposta
- habilitacao_juridica
- regularidade_fiscal_trabalhista
- qualificacao_economica_financeira
- qualificacao_tecnica
- declaracoes
- declarado_vencedor_assinatura
- faturamento_entrega

PREENCHER SOMENTE SE O EDITAL EXIGIR (caso contrário deixar STRING VAZIA ""):
- prova_de_conceito
- garantia_de_contrato
- prazos
- vistoria
- julgamento_da_proposta
- proposta_revisada

REGRA: se o edital NÃO traz a seção, devolva string vazia "". NÃO escreva "Não se aplica" \
nem "Não consta" — apenas string vazia. A equipe interpreta vazio = seção não exigida pelo edital.

============ REGRAS GERAIS ============
- Responda SEMPRE em português do Brasil FORMAL e CORRETO. Atenção a:
   - Acentuação (não, é, está, já, técnico, jurídico, econômico, etc.)
   - Concordância verbal e nominal (os documentos devem ser apresentados; a proposta deverá conter)
   - Crase quando exigida (à apresentação, à habilitação, à proposta)
   - Pontuação adequada (vírgulas antes de conjunções, ponto final em frases completas)
   - Uso de "deverá", "fica obrigado", "será exigido" em vez de coloquialismos
   - Numerais: por extenso entre parênteses quando o edital o fizer ("5 (cinco) dias úteis")
- Para campos do RESUMO que NÃO constem do edital, escreva "Não consta no edital".
- Considere TODOS os documentos anexados (edital + TR + anexos) na análise consolidada.
- Os primeiros documentos podem ser EXEMPLOS de análises previamente feitas pela equipe — use-os \
como REFERÊNCIA de tom de voz, profundidade e formato. Os documentos seguintes (após a instrução \
de usuário) são o EDITAL real para análise.

============ FORMATAÇÃO EM PARÁGRAFOS ============
Os textos das SEÇÕES (qualificacao_tecnica, habilitacao_juridica, regularidade_fiscal_trabalhista, \
proposta, declaracoes, declarado_vencedor_assinatura, faturamento_entrega, julgamento_da_proposta, \
prova_de_conceito, garantia_de_contrato, vistoria, amostra, prazos, etc.) DEVEM SER ESCRITOS EM \
PARÁGRAFOS:

1. **Cada item citado do edital = um parágrafo separado**. Use "\\n\\n" (dois \\n) para separar \
parágrafos. Exemplo:
   "5.3.5 O prazo máximo para o início dos serviços será de 10 (dez) dias corridos a partir \
da assinatura do contrato.\\n\\n5.3.6 A CONTRATADA deverá apresentar declaração formal..."

2. **NUNCA junte vários itens numerados em um único parágrafo gigante**. Cada item ou bloco \
temático tem o seu próprio parágrafo.

3. **Subtítulos quando o edital os usa**: para subseções como ATENÇÃO, QUESTIONAMENTOS, \
CREDENCIAMENTO, ANEXOS dentro de DOCUMENTAÇÃO, use OBRIGATORIAMENTE em maiúsculas em linha \
própria seguida do conteúdo.

4. **No campo atencoes** (aba Atenções), liste cada risco em parágrafo separado com a citação \
literal numerada do item correspondente.

5. **LISTAS NUNCA INLINE**: quando o edital traz uma lista de alíneas (a), b), c)) ou itens \
numerados (1), 2), 3)) ou subitens (1.1, 1.2, 1.2.1), CADA alínea/item DEVE estar em SUA PRÓPRIA \
LINHA, separada por "\\n\\n". NUNCA escreva "...documentos exigidos: a) certidão; b) atestado; \
c) declaração" em corrido. ESCREVA:
   "...documentos exigidos:\\n\\na) certidão...\\n\\nb) atestado...\\n\\nc) declaração..."
   Vale também para romanos (I, II, III), bullets (•) e qualquer enumeração.

============ COMPLETUDE — NÃO ENTREGUE ANÁLISE PARCIAL ============
A análise da Abächerly é vendida ao cliente. ENTREGAR ANÁLISE INCOMPLETA É INACEITÁVEL.

REGRAS DE COMPLETUDE:
1. **Cada seção FIXA deve ter conteúdo substancial** — copie literalmente itens do edital com \
numeração. Se o edital tem 5 itens sobre HABILITAÇÃO JURÍDICA, cite os 5, não resuma.
2. **NUNCA use ellipsis "..." nem "etc."** — sempre cite o conteúdo completo do item.
3. **NUNCA escreva "Ver item X.Y do edital"** sem citar o item — copie o texto direto.
4. **Cada campo do RESUMO deve estar preenchido** — se a info estiver no edital, EXTRAIA. \
Se realmente não constar, "Não consta no edital".
5. **Pontos de ATENÇÃO devem listar TODOS os riscos** detectados no edital — presencial, \
subcontratação, prova de conceito, banco específico, prazos curtos, garantias, migração, etc. \
Cite item por item, não consolide.
6. **A saída deve seguir EXATAMENTE o padrão da Érika Abächerly** — formal, citação literal \
com numeração, OBRIGATORIAMENTE em maiúsculas para alertas, sem floreios.
7. **Preencha TODOS os campos obrigatórios do schema**. Se você terminou um campo curto, vá \
para o próximo, não pare antes da hora.

Retorne APENAS JSON válido seguindo o schema. Sem markdown, sem texto fora do JSON. \
A resposta DEVE conter o JSON completo.
"""

USER_PROMPT = """\
Analise os documentos da licitação anexos e devolva o JSON da análise no padrão Abächerly.

Os arquivos podem incluir:
- Edital principal
- Termo de Referência
- Anexos (planilhas, especificações técnicas, minuta de contrato)
- Atos normativos / pedidos de esclarecimento

Foco:
1. Identificadores (Conlicitação, UASG, PNCP, Processo, Edital)
2. RESUMO completo — todos os 20+ campos
3. Pontos de ATENÇÃO/RISCO destacados na seção DOCUMENTAÇÃO
4. Habilitação completa (jurídica, fiscal, econômica, técnica)
5. Declarações exigidas
6. Procedimento pós-vencedor e faturamento
7. Seções opcionais (PROVA DE CONCEITO, GARANTIA, VISTORIA, etc.) — só preencher se constarem

Use CITAÇÃO LITERAL com numeração de item para os campos detalhados.

Retorne o JSON completo seguindo o schema.
"""


# ============================================================
# Extração de Cartão CNPJ — pré-preenchimento de cadastro
# ============================================================

CNPJ_SCHEMA = {
    "type": "object",
    "properties": {
        "cnpj": {
            "type": "string",
            "description": "CNPJ formatado XX.XXX.XXX/XXXX-XX"
        },
        "razaoSocial": {
            "type": "string",
            "description": "Razão Social (NOME EMPRESARIAL no cartão)"
        },
        "nomeFantasia": {
            "type": "string",
            "description": "Nome Fantasia (TÍTULO DO ESTABELECIMENTO). Vazio se não houver."
        },
        "porteEmpresa": {
            "type": "string",
            "enum": ["MEI", "ME", "EPP", "Medio", "Grande", ""],
            "description": "Porte: MEI, ME, EPP, Medio, Grande. Mapear: MICROEMPRESA -> ME, EMPRESA DE PEQUENO PORTE -> EPP, DEMAIS / não informado -> Medio (deixa em branco se incerto)."
        },
        "telefone": {
            "type": "string",
            "description": "Telefone formatado (XX) XXXX-XXXX. Vazio se não houver."
        },
        "emailContato": {
            "type": "string",
            "description": "E-mail. Vazio se não houver."
        },
        "endereco": {
            "type": "string",
            "description": "Endereço completo concatenado: Logradouro, Número, Complemento, Bairro, Município/UF, CEP."
        }
    },
    "required": ["cnpj", "razaoSocial"]
}

CNPJ_SYSTEM_INSTRUCTION = """\
Você é um extrator de dados de Cartão CNPJ emitido pela Receita Federal do Brasil.

Sua tarefa: ler o documento (PDF ou imagem do cartão CNPJ) e devolver APENAS um JSON \
com os campos do schema, em português do Brasil.

Regras:
1. CNPJ no formato XX.XXX.XXX/XXXX-XX (com pontuação).
2. Razão Social = campo "NOME EMPRESARIAL".
3. Nome Fantasia = campo "TÍTULO DO ESTABELECIMENTO (NOME DE FANTASIA)". Se não tiver, devolva string vazia.
4. Porte: mapeie "MICROEMPRESA"->"ME", "EMPRESA DE PEQUENO PORTE"->"EPP", "DEMAIS"->"Medio", \
   se for MEI deixe "MEI", se duvidar deixe "" (string vazia).
5. Endereço: concatene LOGRADOURO, NÚMERO, COMPLEMENTO (se houver), BAIRRO, MUNICÍPIO/UF, CEP \
   numa única string legível. Exemplo: "Rua Exemplo, 123, Sala 4, Centro, São Paulo/SP, 01000-000".
6. Telefone formatado com DDD em parênteses. Vazio se não constar.
7. E-mail somente se constar. Vazio se não houver.
8. Se um campo opcional não constar, devolva string vazia "" — NUNCA invente.
9. Retorne SOMENTE o JSON, sem markdown, sem texto extra.
"""

CNPJ_USER_PROMPT = """\
Extraia os dados do Cartão CNPJ anexo seguindo o schema JSON fornecido. \
Retorne apenas o JSON.
"""
