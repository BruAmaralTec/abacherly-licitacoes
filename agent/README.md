# Abächerly Agent

Serviço Python (FastAPI) que analisa editais de licitação usando **Vertex AI Gemini**.

## Endpoints

- `GET /health` — healthcheck
- `POST /analise` — recebe arquivos (multipart) + clientId + criadoPor; cria licitação + análise estruturada
- `GET /analise/{id}` — status + resultado da análise

## Stack

- FastAPI + Uvicorn
- google-cloud-aiplatform (Vertex AI Gemini 2.0 Flash)
- google-cloud-firestore (cria licitações + persiste análises)
- google-cloud-storage (armazena PDFs por 6 meses, configurável)

## Variáveis de ambiente

| Var | Default | Descrição |
|-----|---------|-----------|
| `GCP_PROJECT` | `abacherly-licitacoes` | ID do projeto GCP |
| `GCP_LOCATION` | `us-central1` | Região Vertex AI |
| `GEMINI_MODEL` | `gemini-2.0-flash-001` | Modelo a usar |
| `GCS_BUCKET` | `abacherly-analises` | Bucket de inputs |
| `GCS_PREFIX` | `analises-ia` | Prefixo no bucket |
| `CORS_ORIGINS` | localhost+vercel | Origens CORS permitidas |
| `MAX_FILE_SIZE` | 52428800 | 50MB por arquivo |

## Deploy local

```bash
cd agent
pip install -r requirements.txt
# Autentique: gcloud auth application-default login
uvicorn main:app --reload --port 8080
```

## Deploy Cloud Run

Veja `../scripts/deploy-agent.ps1` (Windows) ou execute manualmente:

```bash
gcloud builds submit --config=cloudbuild.yaml --project=abacherly-licitacoes
```
