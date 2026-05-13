"""Cliente Vertex AI Gemini — extrai metadados + responde análise."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from vertexai import init as vertex_init
from vertexai.generative_models import (
    GenerativeModel,
    GenerationConfig,
    Part,
)

from config import (
    GCP_PROJECT,
    GCP_LOCATION,
    GEMINI_MODEL,
    MAX_EXEMPLOS_FEWSHOT,
    MAX_OUTPUT_TOKENS,
)
from firestore_db import get_config_modelo_gemini, listar_exemplos_treinamento
from prompts import (
    CNPJ_SCHEMA,
    CNPJ_SYSTEM_INSTRUCTION,
    CNPJ_USER_PROMPT,
    EXTRACT_SCHEMA,
    SYSTEM_INSTRUCTION,
    USER_PROMPT,
)
from storage_gcs import baixar_de_firebase_storage

logger = logging.getLogger(__name__)

_initialized = False
_exemplos_cache: list[Part] | None = None


def _ensure_init() -> None:
    global _initialized
    if not _initialized:
        vertex_init(project=GCP_PROJECT, location=GCP_LOCATION)
        _initialized = True


def _parse_json_robusto(text: str, contexto: str = "Gemini") -> dict[str, Any]:
    """Parseia JSON do Gemini com fallback para casos comuns de falha:
      1. Markdown wrapping (```json ... ```)
      2. Texto extra antes/depois do JSON
      3. Truncamento (JSON cortado no meio por max_output_tokens) — tenta
         fechar adicionando aspas/chaves/colchetes faltando.

    Levanta ValueError com mensagem amigável quando esgota tentativas.
    """
    if not text or not text.strip():
        raise ValueError(f"{contexto}: resposta vazia")

    # 1) Strip markdown wrapping (```json ... ``` ou ``` ... ```)
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*\n?", "", t)
        t = re.sub(r"\n?```\s*$", "", t)
        t = t.strip()

    # 2) Extrair primeiro bloco JSON (entre primeiro { e último })
    inicio = t.find("{")
    fim = t.rfind("}")
    if inicio >= 0 and fim > inicio:
        candidato = t[inicio : fim + 1]
    else:
        candidato = t

    # Tentativa direta
    try:
        return json.loads(candidato)
    except json.JSONDecodeError:
        pass

    # 3) Tentativa de recuperar JSON truncado: anexa fechamentos progressivos
    #    Estratégia: contar { [ não fechados e fechar na ordem reversa.
    #    Se a última string ficou aberta (terminou no meio de "..."), fecha aspas.
    aberto_chaves = 0
    aberto_colchetes = 0
    em_string = False
    escape = False
    ultima_pos_segura = 0
    for i, ch in enumerate(candidato):
        if escape:
            escape = False
            continue
        if ch == "\\" and em_string:
            escape = True
            continue
        if ch == '"':
            em_string = not em_string
            continue
        if em_string:
            continue
        if ch == "{":
            aberto_chaves += 1
        elif ch == "}":
            aberto_chaves -= 1
            if aberto_chaves >= 0 and aberto_colchetes == 0:
                ultima_pos_segura = i + 1
        elif ch == "[":
            aberto_colchetes += 1
        elif ch == "]":
            aberto_colchetes -= 1

    # Cenário: string aberta no fim — fecha aspas. Remove último valor parcial
    # (campo que ficou pela metade) cortando até a última vírgula ou {.
    base = candidato[:ultima_pos_segura] if ultima_pos_segura > 0 else candidato
    if not base.rstrip().endswith("}"):
        # Tenta cortar lixo após a última } válida no nível raiz
        ultima_chave = base.rfind("}")
        if ultima_chave > 0:
            base = base[: ultima_chave + 1]

    # Já fechou no nível raiz? Tenta parse.
    try:
        return json.loads(base)
    except json.JSONDecodeError:
        pass

    # Se ainda assim falhar, completa fechamentos balanceados
    completado = candidato
    if em_string:
        completado += '"'
    while aberto_colchetes > 0:
        completado += "]"
        aberto_colchetes -= 1
    while aberto_chaves > 0:
        completado += "}"
        aberto_chaves -= 1
    try:
        return json.loads(completado)
    except json.JSONDecodeError as exc:
        # Última cartada: salva trecho do problema e propaga erro com contexto
        snippet_inicio = max(0, getattr(exc, "pos", 0) - 200)
        snippet_fim = min(len(text), getattr(exc, "pos", 0) + 200)
        logger.error(
            "[%s] JSON irrecuperavel. err=%s pos=%s len=%d snippet=%r",
            contexto,
            exc,
            getattr(exc, "pos", "?"),
            len(text),
            text[snippet_inicio:snippet_fim],
        )
        raise ValueError(
            f"Resposta do {contexto} não pôde ser parseada como JSON. "
            f"Provavel truncamento na resposta (length={len(text)}). "
            f"Tente reduzir a quantidade de documentos enviados ou simplifique."
        ) from exc


def _modelo_atual() -> str:
    """Modelo Gemini efetivo: Firestore > env var > default código."""
    return get_config_modelo_gemini(default=GEMINI_MODEL)


def _carregar_exemplos() -> list[Part]:
    """Carrega exemplos de análise como Parts do Gemini (few-shot reference).

    Cache em processo — exemplos não mudam durante uma execução do container.
    Re-deploy do Cloud Run força recarga.
    """
    global _exemplos_cache
    if _exemplos_cache is not None:
        return _exemplos_cache

    parts: list[Part] = []
    try:
        exemplos = listar_exemplos_treinamento(limit=MAX_EXEMPLOS_FEWSHOT)
        for ex in exemplos:
            path = ex.get("arquivoPath", "")
            if not path:
                continue
            try:
                conteudo = baixar_de_firebase_storage(path)
                parts.append(Part.from_data(data=conteudo, mime_type=ex.get("mimeType", "application/pdf")))
                logger.info("exemplo carregado: %s (%d bytes)", ex.get("nome"), len(conteudo))
            except Exception as exc:
                logger.warning("falha ao carregar exemplo %s: %s", ex.get("nome"), exc)
    except Exception as exc:
        logger.warning("nao foi possivel listar exemplos de treinamento: %s", exc)

    _exemplos_cache = parts
    logger.info("total de exemplos carregados: %d", len(parts))
    return parts


def analisar_arquivos(arquivos: list[tuple[str, bytes, str]]) -> dict[str, Any]:
    """Envia múltiplos arquivos para o Gemini e recebe extração estruturada.

    arquivos: lista de (nome, conteudo_bytes, mime_type)
    Retorna dict seguindo EXTRACT_SCHEMA.
    """
    _ensure_init()

    exemplos_parts = _carregar_exemplos()

    system = SYSTEM_INSTRUCTION
    if exemplos_parts:
        system = (
            SYSTEM_INSTRUCTION
            + "\n\nIMPORTANTE: Os primeiros documentos anexados a esta conversa são EXEMPLOS de "
            "análises completas previamente feitas pela equipe Abächerly. Use-os como REFERÊNCIA "
            "de formato, profundidade e estilo das respostas. Os documentos seguintes (após a "
            "instrução de usuário) são o EDITAL real que você deve analisar agora."
        )

    model = GenerativeModel(
        model_name=_modelo_atual(),
        system_instruction=system,
    )

    parts: list[Part] = list(exemplos_parts)

    # Lista numerada dos arquivos enviados — o Gemini não tem acesso ao nome
    # do arquivo a partir do Part. Esta nota textual permite que ele cite a
    # fonte ao final de cada bloco no formato "(NomeArquivo, pg. X)".
    nomes_arquivos = "\n".join(
        f"  Arquivo {i+1}: {nome}" for i, (nome, _, _) in enumerate(arquivos)
    )
    parts.append(
        Part.from_text(
            "Os documentos a seguir são o EDITAL real que você deve analisar.\n"
            f"Nomes dos arquivos (na ordem em que aparecem):\n{nomes_arquivos}\n\n"
            "Use esses nomes EXATAMENTE quando citar a fonte ao final de cada "
            "bloco de citação literal, no formato '(NomeArquivo, pg. X)'."
        )
    )

    for nome, conteudo, mime in arquivos:
        try:
            parts.append(Part.from_data(data=conteudo, mime_type=mime))
            logger.info("anexado %s (%s, %d bytes)", nome, mime, len(conteudo))
        except Exception as exc:
            logger.warning("falha ao anexar %s: %s", nome, exc)

    parts.append(Part.from_text(USER_PROMPT))

    response = model.generate_content(
        parts,
        generation_config=GenerationConfig(
            temperature=0.1,
            top_p=0.95,
            max_output_tokens=MAX_OUTPUT_TOKENS,
            response_mime_type="application/json",
            response_schema=EXTRACT_SCHEMA,
        ),
    )

    text = response.text or "{}"
    # Log preventivo: se a resposta veio próxima do limite, registra alerta.
    if len(text) > 200_000:
        logger.warning("resposta Gemini muito grande (%d chars) — risco de truncamento", len(text))
    return _parse_json_robusto(text, contexto="Agente IA (análise)")


def extrair_cartao_cnpj(conteudo: bytes, mime_type: str) -> dict[str, Any]:
    """Extrai dados estruturados de um Cartão CNPJ (PDF ou imagem).

    Não usa few-shot dos exemplos de treinamento (são para edital de licitação,
    contexto diferente).
    """
    _ensure_init()

    model = GenerativeModel(
        model_name=_modelo_atual(),
        system_instruction=CNPJ_SYSTEM_INSTRUCTION,
    )

    parts: list[Part] = [
        Part.from_data(data=conteudo, mime_type=mime_type),
        Part.from_text(CNPJ_USER_PROMPT),
    ]

    response = model.generate_content(
        parts,
        generation_config=GenerationConfig(
            temperature=0.0,
            top_p=0.95,
            response_mime_type="application/json",
            response_schema=CNPJ_SCHEMA,
        ),
    )

    text = response.text or "{}"
    return _parse_json_robusto(text, contexto="Agente IA (CNPJ)")
