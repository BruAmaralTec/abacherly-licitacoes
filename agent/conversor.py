"""Conversão de arquivos office para PDF usando LibreOffice headless.

Vertex AI Gemini só aceita PDF, imagens e texto. Para clientes que enviam
Word/Excel/PowerPoint/ODF/RTF/HTML, convertemos transparentemente.
"""
from __future__ import annotations

import logging
import os
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

# Mimes que o Gemini aceita direto — não precisam converter.
GEMINI_MIMES_DIRETOS = {
    "application/pdf",
    "text/plain",
    "image/png",
    "image/jpeg",
}

# Mimes que conseguimos converter para PDF via LibreOffice.
CONVERSIVEL_MIMES = {
    "application/msword",  # .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.ms-excel",  # .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-powerpoint",  # .ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
    "application/vnd.oasis.opendocument.text",  # .odt
    "application/vnd.oasis.opendocument.spreadsheet",  # .ods
    "application/vnd.oasis.opendocument.presentation",  # .odp
    "application/rtf",
    "text/rtf",
    "text/html",
    "application/xhtml+xml",
    "text/csv",
}

# Fallback por extensão quando o navegador manda mime genérico/errado.
EXTENSAO_PARA_MIME = {
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".ods": "application/vnd.oasis.opendocument.spreadsheet",
    ".odp": "application/vnd.oasis.opendocument.presentation",
    ".rtf": "application/rtf",
    ".html": "text/html",
    ".htm": "text/html",
    ".csv": "text/csv",
}


def precisa_converter(mime: str, nome: str) -> bool:
    """Retorna True se o arquivo precisa ser convertido para PDF antes do Gemini."""
    if mime in GEMINI_MIMES_DIRETOS:
        return False
    if mime in CONVERSIVEL_MIMES:
        return True
    # Fallback por extensão (navegador às vezes manda application/octet-stream)
    ext = Path(nome).suffix.lower()
    return EXTENSAO_PARA_MIME.get(ext) in CONVERSIVEL_MIMES


def normalizar_mime(mime: str, nome: str) -> str:
    """Corrige mime quando o navegador manda genérico mas a extensão é conhecida."""
    if mime in GEMINI_MIMES_DIRETOS or mime in CONVERSIVEL_MIMES:
        return mime
    ext = Path(nome).suffix.lower()
    return EXTENSAO_PARA_MIME.get(ext, mime)


def converter_para_pdf(conteudo: bytes, nome: str, timeout: int = 120) -> tuple[bytes, str]:
    """Converte um arquivo office para PDF usando LibreOffice headless.

    Args:
        conteudo: bytes do arquivo original.
        nome: nome original (usado para extensão).
        timeout: timeout em segundos (default 120s — arquivos grandes podem demorar).

    Returns:
        (bytes_pdf, novo_nome_com_extensao_pdf)

    Raises:
        RuntimeError se LibreOffice falhar ou não gerar PDF.
    """
    if not nome:
        nome = "arquivo"

    # Mantém só o stem (sem extensão) — sanitizar para evitar problemas no shell.
    stem = Path(nome).stem.replace("/", "_").replace("\\", "_") or "arquivo"
    ext = Path(nome).suffix.lower() or ".bin"

    with tempfile.TemporaryDirectory(prefix="conv_") as tmp:
        tmp_path = Path(tmp)
        entrada = tmp_path / f"{stem}{ext}"
        entrada.write_bytes(conteudo)

        # Cada conversão usa um UserInstallation isolado para evitar lock entre
        # chamadas paralelas no mesmo container.
        user_dir = tmp_path / "lo_profile"
        cmd = [
            "soffice",
            "--headless",
            "--nologo",
            "--nodefault",
            "--nolockcheck",
            "--norestore",
            f"-env:UserInstallation=file://{user_dir}",
            "--convert-to",
            "pdf",
            "--outdir",
            str(tmp_path),
            str(entrada),
        ]
        logger.info("convertendo %s (%d bytes) para PDF via LibreOffice", nome, len(conteudo))
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=timeout,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(
                f"Conversão de {nome} excedeu o tempo limite de {timeout}s. "
                f"Arquivo muito grande ou complexo — envie diretamente em PDF."
            ) from exc

        saida_pdf = tmp_path / f"{stem}.pdf"
        if not saida_pdf.exists() or saida_pdf.stat().st_size == 0:
            stderr = (result.stderr or b"").decode("utf-8", errors="replace")
            stdout = (result.stdout or b"").decode("utf-8", errors="replace")
            logger.error("libreoffice falhou para %s. stdout=%s stderr=%s", nome, stdout, stderr)
            raise RuntimeError(
                f"Falha ao converter {nome} para PDF. "
                f"Verifique se o arquivo não está corrompido ou protegido por senha."
            )

        pdf_bytes = saida_pdf.read_bytes()
        novo_nome = f"{stem}.pdf"
        logger.info("conversão OK: %s -> %s (%d bytes)", nome, novo_nome, len(pdf_bytes))
        return pdf_bytes, novo_nome
