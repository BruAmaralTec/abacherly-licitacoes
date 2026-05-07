"""Cliente Firestore — cria licitação e salva análise."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from google.cloud import firestore

from config import GCP_PROJECT

logger = logging.getLogger(__name__)

_client: firestore.Client | None = None


def get_db() -> firestore.Client:
    global _client
    if _client is None:
        _client = firestore.Client(project=GCP_PROJECT)
    return _client


def criar_analise(
    client_id: str,
    criado_por: str,
    arquivos_uri: list[str],
) -> str:
    """Cria um doc em analises_ia com status 'processando' e retorna o ID."""
    db = get_db()
    agora = datetime.now(timezone.utc)
    doc_ref = db.collection("analises_ia").document()
    doc_ref.set({
        "clientId": client_id,
        "criadoPor": criado_por,
        "criadoEm": agora,
        "atualizadoEm": agora,
        "status": "processando",
        "arquivos": arquivos_uri,
        "liberadoParaCliente": False,
    })
    return doc_ref.id


def atualizar_analise(analise_id: str, dados: dict[str, Any]) -> None:
    db = get_db()
    dados["atualizadoEm"] = datetime.now(timezone.utc)
    db.collection("analises_ia").document(analise_id).update(dados)


def buscar_analise(analise_id: str) -> dict[str, Any] | None:
    db = get_db()
    snap = db.collection("analises_ia").document(analise_id).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    data["id"] = snap.id
    return data


def criar_licitacao(
    client_id: str,
    criado_por: str,
    extracao: dict[str, Any],
    analise_id: str,
) -> str:
    """Cria nova licitação no Firestore a partir da extração do agente.

    Schema novo (padrão Abächerly): cabeçalho + resumo + 10 seções fixas + 6 opcionais.
    """
    db = get_db()
    agora = datetime.now(timezone.utc)

    # Converter data_certame string -> Timestamp
    data_certame = agora
    raw_data = extracao.get("data_certame")
    if raw_data:
        try:
            data_certame = datetime.fromisoformat(raw_data).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            pass

    resumo = extracao.get("resumo") or {}
    doc_estruturada = extracao.get("documentacao") or {}

    # Compõe a string da seção DOCUMENTAÇÃO (legado) a partir das subseções novas
    partes_doc = []
    if doc_estruturada.get("atencao"):
        partes_doc.append(f"ATENÇÃO\n{doc_estruturada.get('atencao')}")
    if doc_estruturada.get("questionamentos"):
        partes_doc.append(f"QUESTIONAMENTOS\n{doc_estruturada.get('questionamentos')}")
    if doc_estruturada.get("credenciamento"):
        partes_doc.append(f"CREDENCIAMENTO\n{doc_estruturada.get('credenciamento')}")
    if doc_estruturada.get("anexos"):
        partes_doc.append(f"ANEXOS\n{doc_estruturada.get('anexos')}")
    documentacao_flat = "\n\n".join(partes_doc)

    analise_completa = {
        # Campos legados (UI atual lê estes nomes)
        "fusoHorario": resumo.get("fusoHorario", ""),
        "baseLegal": resumo.get("baseLegal", ""),
        "enquadramentoEmpresa": resumo.get("enquadramentoEmpresa", ""),
        "valorIntervaloLance": resumo.get("valorIntervaloLance", ""),
        "formalizacao": resumo.get("formalizacao", ""),
        "portal": resumo.get("portal", ""),
        "criterioJulgamento": resumo.get("criterioJulgamento", ""),
        "modoDisputa": resumo.get("modoDisputa", ""),
        "dataLimiteCadastramento": resumo.get("dataLimiteCadastramento", ""),
        "garantiaContrato": resumo.get("garantiaContrato", ""),
        "validadeProposta": resumo.get("validadeProposta", ""),
        "vigenciaTotalContrato": resumo.get("vigenciaTotalContrato", ""),
        "pagamento": resumo.get("pagamento", ""),
        "recurso": resumo.get("recurso", ""),
        "propostaAdequada": resumo.get("propostaAdequada", ""),
        "assinaturaContrato": resumo.get("assinaturaContrato", ""),
        "processo": extracao.get("numero_processo", ""),

        # Seções (texto longo) — nomes legados
        "documentacao": documentacao_flat,
        "garantiaContratoDetalhe": extracao.get("garantia_de_contrato", ""),
        "proposta": extracao.get("proposta", ""),
        "propostaRevisada": extracao.get("proposta_revisada", ""),
        "habilitacaoJuridica": extracao.get("habilitacao_juridica", ""),
        "regularidadeFiscal": extracao.get("regularidade_fiscal_trabalhista", ""),
        "qualificacaoEconomica": extracao.get("qualificacao_economica_financeira", ""),
        "qualificacaoTecnica": extracao.get("qualificacao_tecnica", ""),
        "declaracoes": extracao.get("declaracoes", ""),
        "julgamentoProposta": extracao.get("julgamento_da_proposta", ""),
        "declaradoVencedor": extracao.get("declarado_vencedor_assinatura", ""),
        "faturamentoEntrega": extracao.get("faturamento_entrega", ""),

        # Campos novos do schema Abacherly
        "contratacaoMaoObra": resumo.get("contratacaoMaoObra", ""),
        "remotoOuPresencial": resumo.get("remotoOuPresencial", ""),
        "dedicacaoExclusivaPerfis": resumo.get("dedicacaoExclusivaPerfis", ""),
        "dataLimiteCredenciamento": resumo.get("dataLimiteCredenciamento", ""),
        "dataLimiteEsclarecimentos": resumo.get("dataLimiteEsclarecimentos", ""),
        "provaConceitoFlag": resumo.get("provaConceitoFlag", ""),
        "amostra": resumo.get("amostra", ""),
        "documentacaoEstruturada": doc_estruturada,
        "provaDeConceito": extracao.get("prova_de_conceito", ""),
        "garantiaDeContrato": extracao.get("garantia_de_contrato", ""),
        "prazos": extracao.get("prazos", ""),
        "vistoria": extracao.get("vistoria", ""),
    }

    doc_ref = db.collection("licitacoes").document()
    doc_ref.set({
        "numero": extracao.get("numero", ""),
        "numeroEdital": extracao.get("numero_edital", ""),
        "numeroProcesso": extracao.get("numero_processo", ""),
        "codigoConlicitacao": extracao.get("numero_conlicitacao", ""),
        "uasg": extracao.get("uasg", ""),
        "idPncp": extracao.get("id_pncp", ""),
        "objeto": extracao.get("objeto", ""),
        "orgao": extracao.get("orgao", ""),
        "modalidade": extracao.get("modalidade", ""),
        "valorEstimado": float(extracao.get("valor_estimado") or 0),
        "dataCertame": data_certame,
        "horaCertame": extracao.get("hora_certame", ""),
        "prazoEntrega": extracao.get("prazo_entrega", ""),
        "localEntrega": extracao.get("local_entrega", ""),
        "status": "em_analise",
        "resumoIA": extracao.get("objeto_resumido", ""),
        "analise": analise_completa,
        "analiseIaId": analise_id,
        "clientId": client_id,
        "criadoPor": criado_por,
        "criadoEm": agora,
        "atualizadoEm": agora,
    })
    return doc_ref.id


def get_config_retencao_meses() -> int:
    """Lê configuração de retenção (meses) — default 6."""
    db = get_db()
    snap = db.collection("configuracoes").document("sistema").get()
    if not snap.exists:
        return 6
    data = snap.to_dict() or {}
    return int(data.get("retencaoMesesAgente", 6))


def get_config_modelo_gemini(default: str) -> str:
    """Lê o modelo Gemini configurado no Firestore.

    Precedência: Firestore (configuracoes/sistema.modeloGemini) > parâmetro default.
    Falha silenciosa retorna default — agente continua funcionando se Firestore cair.
    """
    try:
        db = get_db()
        snap = db.collection("configuracoes").document("sistema").get()
        if not snap.exists:
            return default
        data = snap.to_dict() or {}
        modelo = (data.get("modeloGemini") or "").strip()
        return modelo if modelo else default
    except Exception as exc:
        logger.warning("falha ao ler modelo Gemini do Firestore: %s — usando default %s", exc, default)
        return default


def listar_exemplos_treinamento() -> list[dict[str, Any]]:
    """Lista os exemplos de análise (few-shot reference) cadastrados pelo admin.

    Cada item tem: nome, descricao, arquivoPath (path no Firebase Storage),
    enviadoPor, criadoEm. O agente baixa estes arquivos e injeta no prompt.
    """
    db = get_db()
    docs = db.collection("exemplos_analise").stream()
    out: list[dict[str, Any]] = []
    for d in docs:
        data = d.to_dict() or {}
        out.append({
            "id": d.id,
            "nome": data.get("nome", ""),
            "descricao": data.get("descricao", ""),
            "arquivoPath": data.get("arquivoPath", ""),
            "mimeType": data.get("mimeType", "application/octet-stream"),
        })
    return out
