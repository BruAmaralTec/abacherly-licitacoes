"""Agente de análise de licitações — FastAPI + Vertex AI Gemini.

Endpoints:
  GET  /health                -> healthcheck
  POST /analise               -> upload de arquivos + criação de licitação + análise IA
  GET  /analise/{id}          -> status e resultado
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import ACCEPTED_MIMES, CORS_ORIGINS, MAX_FILE_SIZE
from firestore_db import (
    atualizar_analise,
    buscar_analise,
    criar_analise,
    criar_licitacao,
)
from gemini_client import analisar_arquivos, extrair_cartao_cnpj
from storage_gcs import baixar_para_memoria, upload_arquivo

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("agent")

app = FastAPI(title="Abächerly Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnaliseResponse(BaseModel):
    analise_id: str
    licitacao_id: str | None = None
    status: str
    extracao: dict[str, Any] | None = None
    erro: str | None = None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analise", response_model=AnaliseResponse)
async def criar_analise_endpoint(
    background: BackgroundTasks,
    client_id: str = Form(...),
    criado_por: str = Form(...),
    arquivos: list[UploadFile] = File(...),
) -> AnaliseResponse:
    if not arquivos:
        raise HTTPException(400, "Pelo menos um arquivo é obrigatório")

    arquivos_processados: list[tuple[str, bytes, str]] = []
    arquivos_uri: list[str] = []
    analise_id_temp = uuid.uuid4().hex

    for upload in arquivos:
        conteudo = await upload.read()
        if len(conteudo) > MAX_FILE_SIZE:
            raise HTTPException(413, f"Arquivo {upload.filename} excede {MAX_FILE_SIZE} bytes")
        mime = upload.content_type or "application/octet-stream"
        if mime not in ACCEPTED_MIMES:
            # Word não é aceito pelo Vertex AI Gemini — orienta o usuário a converter.
            if mime in ("application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"):
                raise HTTPException(
                    415,
                    f"Arquivo {upload.filename}: Word (.doc/.docx) não é suportado. "
                    "Converta para PDF antes de enviar.",
                )
            raise HTTPException(
                415,
                f"Arquivo {upload.filename}: formato {mime} não é suportado. "
                "Use PDF, imagem (PNG/JPG) ou texto (.txt).",
            )

        # Sanitização básica do filename
        nome = (upload.filename or "arquivo").replace("/", "_").replace("\\", "_")
        uri = upload_arquivo(analise_id_temp, nome, conteudo, mime)
        arquivos_uri.append(uri)
        arquivos_processados.append((nome, conteudo, mime))

    analise_id = criar_analise(
        client_id=client_id,
        criado_por=criado_por,
        arquivos_uri=arquivos_uri,
    )

    # Processa em background — retorna imediatamente
    background.add_task(
        _processar_analise,
        analise_id=analise_id,
        client_id=client_id,
        criado_por=criado_por,
        arquivos=arquivos_processados,
    )

    return AnaliseResponse(analise_id=analise_id, status="processando")


class CNPJResponse(BaseModel):
    extracao: dict[str, Any]


@app.post("/extrair-cnpj", response_model=CNPJResponse)
async def extrair_cnpj_endpoint(
    arquivo: UploadFile = File(...),
) -> CNPJResponse:
    """Extrai dados de um Cartão CNPJ (PDF ou imagem) para pré-preenchimento de cadastro."""
    conteudo = await arquivo.read()
    if len(conteudo) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Arquivo excede {MAX_FILE_SIZE} bytes")
    mime = arquivo.content_type or "application/pdf"
    if mime not in ACCEPTED_MIMES:
        logger.warning("mime não-listado %s para cartão CNPJ — aceitando mesmo assim", mime)

    try:
        dados = extrair_cartao_cnpj(conteudo, mime)
        logger.info("cartão CNPJ extraído: %s", dados.get("cnpj", "?"))
        return CNPJResponse(extracao=dados)
    except Exception as exc:
        logger.exception("erro extraindo cartão CNPJ: %s", exc)
        raise HTTPException(500, f"Erro ao extrair dados: {exc}")


@app.get("/analise/{analise_id}", response_model=AnaliseResponse)
async def buscar_analise_endpoint(analise_id: str) -> AnaliseResponse:
    doc = buscar_analise(analise_id)
    if doc is None:
        raise HTTPException(404, "Análise não encontrada")
    return AnaliseResponse(
        analise_id=analise_id,
        licitacao_id=doc.get("licitacaoId"),
        status=doc.get("status", "processando"),
        extracao=doc.get("extracao"),
        erro=doc.get("erro"),
    )


def _processar_analise(
    analise_id: str,
    client_id: str,
    criado_por: str,
    arquivos: list[tuple[str, bytes, str]],
) -> None:
    """Job background: chama Gemini, cria licitação, atualiza doc analise."""
    try:
        logger.info("[%s] iniciando análise com %d arquivos", analise_id, len(arquivos))
        extracao = analisar_arquivos(arquivos)
        logger.info("[%s] extração concluída: %s", analise_id, extracao.get("numero", "?"))

        licitacao_id = criar_licitacao(
            client_id=client_id,
            criado_por=criado_por,
            extracao=extracao,
            analise_id=analise_id,
        )

        atualizar_analise(analise_id, {
            "status": "concluida",
            "extracao": extracao,
            "licitacaoId": licitacao_id,
        })
        logger.info("[%s] concluída — licitação %s", analise_id, licitacao_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("[%s] erro: %s", analise_id, exc)
        # Mensagens amigáveis para erros conhecidos do Vertex AI Gemini.
        msg = str(exc)
        if "Publisher Model" in msg and "not found" in msg:
            msg = (
                "Modelo Gemini selecionado não está disponível neste projeto GCP. "
                "Modelos preview (3.x) requerem allowlist. Troque em /configuracoes "
                "para gemini-2.5-flash ou outro modelo estável."
            )
        elif "mimeType" in msg and "not supported" in msg:
            msg = (
                "Algum arquivo enviado tem formato não suportado pelo Gemini. "
                "Use somente PDF, PNG, JPG ou TXT."
            )
        atualizar_analise(analise_id, {
            "status": "erro",
            "erro": msg[:500],
        })
