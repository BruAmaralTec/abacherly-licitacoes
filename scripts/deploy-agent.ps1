# Deploy do agente Python para Cloud Run via Cloud Build.
param(
    [string]$ProjectId = "abacherly-licitacoes",
    [string]$Region = "us-central1"
)

$ErrorActionPreference = "Stop"

Write-Host "→ Submetendo build ao Cloud Build..." -ForegroundColor Cyan
gcloud builds submit `
    --config=agent/cloudbuild.yaml `
    --project=$ProjectId `
    --substitutions=COMMIT_SHA=manual-$(Get-Date -Format 'yyyyMMddHHmmss') `
    .

Write-Host ""
Write-Host "→ URL do serviço:" -ForegroundColor Cyan
gcloud run services describe abacherly-agent --region=$Region --format="value(status.url)"
