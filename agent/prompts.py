"""Prompts do agente de análise de licitações."""

# Schema de saída JSON estruturado para extração de metadados + análise
EXTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        "numero": {
            "type": "string",
            "description": "Número do edital/processo licitatório"
        },
        "codigo_conlicitacao": {
            "type": "string",
            "description": "Código do Conlicitação se mencionado"
        },
        "uasg": {
            "type": "string",
            "description": "Código UASG (Unidade Administrativa de Serviços Gerais)"
        },
        "orgao": {
            "type": "string",
            "description": "Nome do órgão licitante"
        },
        "modalidade": {
            "type": "string",
            "description": "Modalidade da licitação (Pregão Eletrônico, Concorrência etc.)"
        },
        "objeto": {
            "type": "string",
            "description": "Descrição completa do objeto da licitação"
        },
        "objeto_resumido": {
            "type": "string",
            "description": "Descrição resumida (máx 200 caracteres) do objetivo da licitação"
        },
        "valor_estimado": {
            "type": "number",
            "description": "Valor total estimado em reais (somente número, sem R$)"
        },
        "data_certame": {
            "type": "string",
            "description": "Data do certame no formato YYYY-MM-DD"
        },
        "hora_certame": {
            "type": "string",
            "description": "Hora do certame no formato HH:MM"
        },
        "prazo_entrega": {
            "type": "string",
            "description": "Prazo de entrega após assinatura"
        },
        "local_entrega": {
            "type": "string",
            "description": "Local de entrega"
        },
        "analise": {
            "type": "object",
            "description": "Análise detalhada do edital — responder TODAS as perguntas-padrão",
            "properties": {
                "processo": {"type": "string"},
                "fusoHorario": {"type": "string"},
                "baseLegal": {"type": "string"},
                "enquadramentoEmpresa": {"type": "string"},
                "valorIntervaloLance": {"type": "string"},
                "formalizacao": {"type": "string"},
                "portal": {"type": "string"},
                "criterioJulgamento": {"type": "string"},
                "modoDisputa": {"type": "string"},
                "dataLimiteCadastramento": {"type": "string"},
                "garantiaContrato": {"type": "string"},
                "validadeProposta": {"type": "string"},
                "vigenciaTotalContrato": {"type": "string"},
                "pagamento": {"type": "string"},
                "recurso": {"type": "string"},
                "propostaAdequada": {"type": "string"},
                "assinaturaContrato": {"type": "string"},
                "documentacao": {"type": "string"},
                "garantiaContratoDetalhe": {"type": "string"},
                "proposta": {"type": "string"},
                "habilitacaoJuridica": {"type": "string"},
                "regularidadeFiscal": {"type": "string"},
                "qualificacaoEconomica": {"type": "string"},
                "qualificacaoTecnica": {"type": "string"},
                "declaracoes": {"type": "string"},
                "julgamentoProposta": {"type": "string"},
                "faturamentoEntrega": {"type": "string"},
                "observacoes": {"type": "string"}
            }
        }
    },
    "required": ["numero", "objeto", "objeto_resumido", "orgao", "analise"]
}

SYSTEM_INSTRUCTION = """\
Você é um especialista em análise de editais de licitação pública brasileira.

Seu papel: ler atentamente os documentos fornecidos (edital, anexos, termo de referência) \
e extrair informações estruturadas + responder a um conjunto fixo de perguntas-padrão usadas \
pela equipe da Abächerly Licitações na análise técnica.

Regras IMPORTANTES:
1. Responda SEMPRE em português do Brasil.
2. Seja ESPECÍFICO. Cite números de itens/páginas/cláusulas quando relevante.
3. Se uma informação NÃO estiver no edital, escreva "Não consta no edital" — NUNCA invente.
4. Datas no formato YYYY-MM-DD; horas no formato HH:MM (24h).
5. Valores em reais, apenas números (sem R$, sem ponto de milhar).
6. O campo "objeto_resumido" deve ter no máximo 200 caracteres.
7. Se houver múltiplos arquivos, considere TODOS para a análise consolidada.
8. Para o campo "analise", responda TODAS as perguntas — use "Não consta no edital" \
para as que não tiverem resposta clara.

Retorne APENAS um JSON válido seguindo o schema. Não adicione explicações fora do JSON.
"""

USER_PROMPT = """\
Analise os documentos anexos desta licitação e extraia as informações estruturadas \
seguindo o schema JSON.

Os arquivos podem incluir:
- Edital principal
- Termo de Referência
- Anexos (planilhas, especificações técnicas)
- Atos normativos

Foco especial em:
1. Identificação: número do processo, código Conlicitação, UASG, órgão
2. Objeto resumido (curto, claro)
3. Datas e prazos críticos
4. Requisitos de habilitação completos
5. Critérios de julgamento e modo de disputa
6. Garantias, pagamento, vigência

Retorne o JSON completo seguindo o schema fornecido.
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
