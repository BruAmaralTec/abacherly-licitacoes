"""Configurações do agente — lidas de variáveis de ambiente."""
import os

GCP_PROJECT = os.environ.get("GCP_PROJECT", "abacherly-licitacoes")
GCP_LOCATION = os.environ.get("GCP_LOCATION", "us-central1")

# Modelo Gemini — default do código. Pode ser sobrescrito via env var ou
# via Firestore (configuracoes/sistema.modeloGemini, lido a cada chamada).
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# Quantos exemplos de few-shot (analises previas da equipe) carregar.
# Mais exemplos != melhor qualidade — Gemini com 100+ docs tende a:
#   1. Confundir o foco (qual e o EDITAL real?)
#   2. Cortar saida por exceder context window
#   3. Demorar muito mais
# 10 mais recentes representam o padrao atual da Abacherly e dao bom few-shot.
MAX_EXEMPLOS_FEWSHOT = int(os.environ.get("MAX_EXEMPLOS_FEWSHOT", "10"))

# Maximo de tokens na resposta. Com a regra absoluta "trazer TUDO pertinente",
# as respostas ficaram muito maiores. Subimos para 65535 (limite max do Gemini
# 2.5 com response_mime_type=json). O parser tambem ganhou resiliencia a
# truncamento e markdown wrapping.
MAX_OUTPUT_TOKENS = int(os.environ.get("MAX_OUTPUT_TOKENS", "65535"))

# Bucket GCS dedicado a inputs do agente (lifecycle 6 meses configurado fora)
GCS_BUCKET = os.environ.get("GCS_BUCKET", "abacherly-analises")

# Path prefix dentro do bucket
GCS_PREFIX = os.environ.get("GCS_PREFIX", "analises-ia")

# Origens permitidas (CORS) — Vercel + dev local
CORS_ORIGINS = [
    o.strip() for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,https://abacherly-licitacoes.vercel.app"
    ).split(",") if o.strip()
]

# Tamanho máximo por arquivo (50MB)
MAX_FILE_SIZE = int(os.environ.get("MAX_FILE_SIZE", str(50 * 1024 * 1024)))

# Tipos MIME aceitos pelo Vertex AI Gemini (multimodal).
# Word (.doc/.docx) NÃO é suportado — o Gemini retorna 400 mimeType inválido.
# Cliente precisa converter para PDF antes do upload.
ACCEPTED_MIMES = {
    "application/pdf",
    "text/plain",
    "image/png",
    "image/jpeg",
}
