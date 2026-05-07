"""Configurações do agente — lidas de variáveis de ambiente."""
import os

GCP_PROJECT = os.environ.get("GCP_PROJECT", "abacherly-licitacoes")
GCP_LOCATION = os.environ.get("GCP_LOCATION", "us-central1")

# Modelo Gemini — default do código. Pode ser sobrescrito via env var ou
# via Firestore (configuracoes/sistema.modeloGemini, lido a cada chamada).
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

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

# Tipos MIME aceitos
ACCEPTED_MIMES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/png",
    "image/jpeg",
}
