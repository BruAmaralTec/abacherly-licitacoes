"""Cliente Vertex AI Gemini — extrai metadados + responde análise."""
from __future__ import annotations

import json
import logging
from typing import Any

from vertexai import init as vertex_init
from vertexai.generative_models import (
    GenerativeModel,
    GenerationConfig,
    Part,
)

from config import GCP_PROJECT, GCP_LOCATION, GEMINI_MODEL
from firestore_db import listar_exemplos_treinamento
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
        exemplos = listar_exemplos_treinamento()
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
        model_name=GEMINI_MODEL,
        system_instruction=system,
    )

    parts: list[Part] = list(exemplos_parts)
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
            response_mime_type="application/json",
            response_schema=EXTRACT_SCHEMA,
        ),
    )

    text = response.text or "{}"
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error("JSON inválido do Gemini: %s\nresposta:\n%s", exc, text[:1000])
        raise ValueError("Resposta do modelo não pôde ser parseada como JSON") from exc


def extrair_cartao_cnpj(conteudo: bytes, mime_type: str) -> dict[str, Any]:
    """Extrai dados estruturados de um Cartão CNPJ (PDF ou imagem).

    Não usa few-shot dos exemplos de treinamento (são para edital de licitação,
    contexto diferente).
    """
    _ensure_init()

    model = GenerativeModel(
        model_name=GEMINI_MODEL,
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
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error("JSON inválido do Gemini (CNPJ): %s\nresposta:\n%s", exc, text[:1000])
        raise ValueError("Resposta do modelo não pôde ser parseada como JSON") from exc
