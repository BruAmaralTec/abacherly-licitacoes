"""Agente de análise de licitações — FastAPI + Vertex AI Gemini.

Endpoints:
  GET  /health                -> healthcheck
  POST /analise               -> upload de arquivos + criação de licitação + análise IA
  GET  /analise/{id}          -> status, fase, progresso e resultado
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import CORS_ORIGINS, MAX_FILE_SIZE
from conversor import (
    CONVERSIVEL_MIMES,
    GEMINI_MIMES_DIRETOS,
    converter_para_pdf,
    normalizar_mime,
    precisa_converter,
)
from firestore_db import (
    atualizar_analise,
    buscar_analise,
    criar_analise,
    criar_licitacao,
)
from gemini_client import analisar_arquivos, extrair_cartao_cnpj
from storage_gcs import upload_arquivo

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("agent")

app = FastAPI(title="Abächerly Agent", version="1.1.0")

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
    fase: str | None = None
    progresso_conversao: int | None = None
    mensagem: str | None = None
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
        nome = (upload.filename or "arquivo").replace("/", "_").replace("\\", "_")
        mime_raw = upload.content_type or "application/octet-stream"
        mime = normalizar_mime(mime_raw, nome)

        # Aceita tudo que o Gemini lê direto OU que conseguimos converter.
        if mime not in GEMINI_MIMES_DIRETOS and mime not in CONVERSIVEL_MIMES:
            raise HTTPException(
                415,
                f"Arquivo {nome}: formato {mime_raw} não é suportado. Tipos aceitos: "
                "PDF, PNG, JPG, TXT, Word, Excel, PowerPoint, ODF, RTF, HTML, CSV.",
            )

        uri = upload_arquivo(analise_id_temp, nome, conteudo, mime)
        arquivos_uri.append(uri)
        arquivos_processados.append((nome, conteudo, mime))

    analise_id = criar_analise(
        client_id=client_id,
        criado_por=criado_por,
        arquivos_uri=arquivos_uri,
    )

    background.add_task(
        _processar_analise,
        analise_id=analise_id,
        client_id=client_id,
        criado_por=criado_por,
        arquivos=arquivos_processados,
    )

    return AnaliseResponse(analise_id=analise_id, status="processando", fase="convertendo")


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
    nome = arquivo.filename or "cnpj"
    mime = normalizar_mime(arquivo.content_type or "application/pdf", nome)

    # Cartão CNPJ vem em PDF/imagem geralmente — converter office se vier.
    if mime not in GEMINI_MIMES_DIRETOS:
        if mime in CONVERSIVEL_MIMES:
            try:
                conteudo, _ = converter_para_pdf(conteudo, nome)
                mime = "application/pdf"
            except RuntimeError as exc:
                raise HTTPException(415, f"Falha ao converter {nome}: {exc}")
        else:
            raise HTTPException(415, f"Formato não suportado: {mime}")

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
        fase=doc.get("fase"),
        progresso_conversao=doc.get("progressoConversao"),
        mensagem=doc.get("mensagem"),
        extracao=doc.get("extracao"),
        erro=doc.get("erro"),
    )


def _processar_analise(
    analise_id: str,
    client_id: str,
    criado_por: str,
    arquivos: list[tuple[str, bytes, str]],
) -> None:
    """Job background: converte office para PDF, chama Gemini, cria licitação."""
    try:
        # ============ FASE 1: Conversão dos arquivos office ============
        a_converter = [a for a in arquivos if precisa_converter(a[2], a[0])]
        total_conversao = len(a_converter)
        arquivos_finais: list[tuple[str, bytes, str]] = []
        idx_conv = 0

        if total_conversao > 0:
            atualizar_analise(
                analise_id,
                {
                    "fase": "convertendo",
                    "progressoConversao": 0,
                    "mensagem": f"Convertendo {total_conversao} arquivo(s) para PDF...",
                },
            )

        for nome, conteudo, mime in arquivos:
            if precisa_converter(mime, nome):
                idx_conv += 1
                atualizar_analise(
                    analise_id,
                    {
                        "fase": "convertendo",
                        "progressoConversao": int(((idx_conv - 1) / total_conversao) * 100),
                        "mensagem": f"Convertendo {nome} ({idx_conv}/{total_conversao})...",
                    },
                )
                try:
                    pdf_bytes, pdf_nome = converter_para_pdf(conteudo, nome)
                    arquivos_finais.append((pdf_nome, pdf_bytes, "application/pdf"))
                except RuntimeError as exc:
                    logger.exception("[%s] falha convertendo %s: %s", analise_id, nome, exc)
                    raise
            else:
                arquivos_finais.append((nome, conteudo, mime))

        if total_conversao > 0:
            atualizar_analise(
                analise_id,
                {
                    "fase": "analisando",
                    "progressoConversao": 100,
                    "mensagem": "Conversão concluída. Iniciando análise com IA...",
                },
            )
        else:
            atualizar_analise(
                analise_id,
                {
                    "fase": "analisando",
                    "mensagem": "Analisando com IA (Gemini)...",
                },
            )

        # ============ FASE 2: Análise IA ============
        logger.info("[%s] iniciando análise com %d arquivos", analise_id, len(arquivos_finais))
        extracao = analisar_arquivos(arquivos_finais)
        logger.info("[%s] extração concluída: %s", analise_id, extracao.get("numero", "?"))

        licitacao_id = criar_licitacao(
            client_id=client_id,
            criado_por=criado_por,
            extracao=extracao,
            analise_id=analise_id,
        )

        atualizar_analise(
            analise_id,
            {
                "status": "concluida",
                "fase": None,
                "mensagem": None,
                "extracao": extracao,
                "licitacaoId": licitacao_id,
            },
        )
        logger.info("[%s] concluída — licitação %s", analise_id, licitacao_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("[%s] erro: %s", analise_id, exc)
        msg = str(exc)
        if "Publisher Model" in msg and "not found" in msg:
            msg = (
                "Modelo Gemini selecionado não está disponível neste projeto GCP. "
                "Modelos preview (3.x) requerem allowlist. Troque em /configuracoes "
                "para gemini-2.5-flash ou outro modelo estável."
            )
        elif "mimeType" in msg and "not supported" in msg:
            msg = (
                "Algum arquivo tem formato que o Gemini não aceita mesmo após conversão. "
                "Tente reenviar como PDF."
            )
        elif "Falha ao converter" in msg or "Conversão de" in msg:
            # Mensagem do conversor já é user-friendly
            pass
        atualizar_analise(
            analise_id,
            {
                "status": "erro",
                "fase": None,
                "erro": msg[:500],
            },
        )
