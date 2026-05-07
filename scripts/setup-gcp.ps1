# Setup inicial GCP - habilita APIs, cria SA, bucket, repositorio Artifact Registry.
# Idempotente: pode rodar quantas vezes precisar.
param(
    [string]$ProjectId = "abacherly-licitacoes",
    [string]$Region = "us-central1",
    [string]$BucketName = "abacherly-analises",
    [string]$ServiceAccount = "abacherly-agent",
    [int]$RetencaoDias = 180
)

# IMPORTANTE: gcloud escreve mensagens informativas no stderr, entao NAO usar ErrorActionPreference=Stop.
# Vamos checar $LASTEXITCODE manualmente.
$ErrorActionPreference = "Continue"

function Run-Gcloud {
    param([string[]]$Args, [string]$Label)
    & gcloud @Args 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERRO] gcloud $($Args -join ' ') (exit $LASTEXITCODE)" -ForegroundColor Red
        return $false
    }
    return $true
}

function Test-Gcloud {
    # Roda gcloud e retorna true se exit code 0 (recurso existe)
    param([string[]]$Args)
    & gcloud @Args 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}

Write-Host "==> Setando projeto: $ProjectId" -ForegroundColor Cyan
Run-Gcloud @("config", "set", "project", $ProjectId) | Out-Null

Write-Host "==> Habilitando APIs (pode levar 1-2 min)..." -ForegroundColor Cyan
$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "aiplatform.googleapis.com",
    "storage.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com"
)
Run-Gcloud (@("services", "enable") + $apis) "habilitar APIs" | Out-Null
Write-Host "  [OK] APIs habilitadas"

# Service Account
$saEmail = "$ServiceAccount@$ProjectId.iam.gserviceaccount.com"
Write-Host "==> Criando Service Account $saEmail..." -ForegroundColor Cyan
if (Test-Gcloud @("iam", "service-accounts", "describe", $saEmail)) {
    Write-Host "  [SKIP] SA ja existe"
} else {
    Run-Gcloud @("iam", "service-accounts", "create", $ServiceAccount,
                 "--display-name=Abacherly Agent (Cloud Run)",
                 "--description=SA do agente IA de analise de licitacoes") | Out-Null
    Write-Host "  [OK] SA criada"
}

# Roles
Write-Host "==> Concedendo roles a SA..." -ForegroundColor Cyan
$roles = @(
    "roles/aiplatform.user",
    "roles/datastore.user",
    "roles/storage.objectAdmin",
    "roles/logging.logWriter"
)
foreach ($role in $roles) {
    Run-Gcloud @("projects", "add-iam-policy-binding", $ProjectId,
                 "--member=serviceAccount:$saEmail",
                 "--role=$role",
                 "--condition=None") | Out-Null
    Write-Host "  [OK] $role"
}

# Artifact Registry
Write-Host "==> Criando repositorio Artifact Registry 'agent'..." -ForegroundColor Cyan
if (Test-Gcloud @("artifacts", "repositories", "describe", "agent", "--location=$Region")) {
    Write-Host "  [SKIP] repositorio ja existe"
} else {
    Run-Gcloud @("artifacts", "repositories", "create", "agent",
                 "--repository-format=docker",
                 "--location=$Region",
                 "--description=Imagens Docker do Abacherly Agent") | Out-Null
    Write-Host "  [OK] repositorio criado"
}

# Bucket GCS
Write-Host "==> Criando bucket gs://$BucketName..." -ForegroundColor Cyan
if (Test-Gcloud @("storage", "buckets", "describe", "gs://$BucketName")) {
    Write-Host "  [SKIP] bucket ja existe"
} else {
    Run-Gcloud @("storage", "buckets", "create", "gs://$BucketName",
                 "--location=$Region",
                 "--uniform-bucket-level-access") | Out-Null
    Write-Host "  [OK] bucket criado"
}

# Lifecycle rule (retencao)
Write-Host "==> Aplicando lifecycle rule de $RetencaoDias dias..." -ForegroundColor Cyan
$lifecycleJson = @"
{
  "rule": [{
    "action": {"type": "Delete"},
    "condition": {"age": $RetencaoDias}
  }]
}
"@
$tmpFile = New-TemporaryFile
$lifecycleJson | Out-File -Encoding ascii $tmpFile.FullName
Run-Gcloud @("storage", "buckets", "update", "gs://$BucketName",
             "--lifecycle-file=$($tmpFile.FullName)") | Out-Null
Remove-Item $tmpFile.FullName -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] lifecycle aplicada"

# Cloud Build SA permissions
Write-Host "==> Concedendo permissoes ao Cloud Build..." -ForegroundColor Cyan
$projectNumber = & gcloud projects describe $ProjectId --format="value(projectNumber)" 2>$null
$projectNumber = ($projectNumber | Out-String).Trim()
$cbSa = "$projectNumber@cloudbuild.gserviceaccount.com"

foreach ($role in @("roles/run.admin", "roles/iam.serviceAccountUser", "roles/artifactregistry.writer")) {
    Run-Gcloud @("projects", "add-iam-policy-binding", $ProjectId,
                 "--member=serviceAccount:$cbSa",
                 "--role=$role",
                 "--condition=None") | Out-Null
    Write-Host "  [OK] $role"
}

# Compute Engine default SA precisa de permissao para Cloud Build usar como SA padrao
$computeSa = "$projectNumber-compute@developer.gserviceaccount.com"
foreach ($role in @("roles/logging.logWriter", "roles/artifactregistry.writer")) {
    Run-Gcloud @("projects", "add-iam-policy-binding", $ProjectId,
                 "--member=serviceAccount:$computeSa",
                 "--role=$role",
                 "--condition=None") | Out-Null
}

Write-Host ""
Write-Host "==> Setup GCP concluido!" -ForegroundColor Green
Write-Host "    Projeto:         $ProjectId"
Write-Host "    Service Account: $saEmail"
Write-Host "    Bucket:          gs://$BucketName (retencao $RetencaoDias dias)"
Write-Host "    Artifact Repo:   $Region-docker.pkg.dev/$ProjectId/agent"
Write-Host ""
Write-Host "Proximo passo: rode .\scripts\deploy-agent.ps1" -ForegroundColor Cyan
