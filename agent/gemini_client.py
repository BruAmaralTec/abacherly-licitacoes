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
from prompts import EXTRACT_SCHEMA, SYSTEM_INSTRUCTION, USER_PROMPT

logger = logging.getLogger(__name__)

_initialized = False


def _ensure_init() -> None:
    global _initialized
    if not _initialized:
        vertex_init(project=GCP_PROJECT, location=GCP_LOCATION)
        _initialized = True


def analisar_arquivos(arquivos: list[tuple[str, bytes, str]]) -> dict[str, Any]:
    """Envia múltiplos arquivos para o Gemini e recebe extração estruturada.

    arquivos: lista de (nome, conteudo_bytes, mime_type)
    Retorna dict seguindo EXTRACT_SCHEMA.
    """
    _ensure_init()

    model = GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=SYSTEM_INSTRUCTION,
    )

    parts: list[Part] = []
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
