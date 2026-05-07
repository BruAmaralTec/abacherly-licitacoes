"""Cliente Cloud Storage — upload de arquivos do agente."""
from __future__ import annotations

import io
import logging
from typing import BinaryIO

from google.cloud import storage

from config import GCS_BUCKET, GCS_PREFIX

logger = logging.getLogger(__name__)

_client: storage.Client | None = None


def get_client() -> storage.Client:
    global _client
    if _client is None:
        _client = storage.Client()
    return _client


def upload_arquivo(
    analise_id: str,
    nome_arquivo: str,
    conteudo: BinaryIO | bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Faz upload de um arquivo para o bucket. Retorna gs:// URI."""
    client = get_client()
    bucket = client.bucket(GCS_BUCKET)
    blob_name = f"{GCS_PREFIX}/{analise_id}/{nome_arquivo}"
    blob = bucket.blob(blob_name)

    if isinstance(conteudo, (bytes, bytearray)):
        blob.upload_from_string(conteudo, content_type=content_type)
    else:
        blob.upload_from_file(conteudo, content_type=content_type, rewind=True)

    uri = f"gs://{GCS_BUCKET}/{blob_name}"
    logger.info("uploaded %s (%s)", uri, content_type)
    return uri


def baixar_para_memoria(gs_uri: str) -> bytes:
    """Baixa um arquivo do GCS para memória."""
    if not gs_uri.startswith("gs://"):
        raise ValueError(f"URI inválida: {gs_uri}")
    path = gs_uri[5:]
    bucket_name, _, blob_name = path.partition("/")
    client = get_client()
    blob = client.bucket(bucket_name).blob(blob_name)
    buf = io.BytesIO()
    blob.download_to_file(buf)
    return buf.getvalue()


def baixar_de_firebase_storage(path: str) -> bytes:
    """Baixa um arquivo do bucket default do Firebase (abacherly-licitacoes.firebasestorage.app)."""
    bucket_name = "abacherly-licitacoes.firebasestorage.app"
    client = get_client()
    blob = client.bucket(bucket_name).blob(path)
    buf = io.BytesIO()
    blob.download_to_file(buf)
    return buf.getvalue()
