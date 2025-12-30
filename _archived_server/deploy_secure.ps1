# deploy_secure.ps1
# This script reads secrets from .env and deploys to Cloud Run.

$ErrorActionPreference = "Stop"

$SecretsFile = "$PSScriptRoot/.env"
$ServiceName = "pitchperfectai-backend"
$Region = "europe-west2"
# Note: we use source deploy so image name is auto-handled, but we can specify if needed.

if (-not (Test-Path $SecretsFile)) {
    Write-Host "Error: .env not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Reading configuration from .env..." -ForegroundColor Cyan

# Read and parse secrets
$EnvVars = @()
Get-Content $SecretsFile | Where-Object { $_ -match '=' -and -not ($_ -match '^\s*#') -and -not ([string]::IsNullOrWhiteSpace($_)) } | ForEach-Object {
    $parts = $_ -split '=', 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    
    # Remove surrounding quotes if present
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    
    if ($key -eq "PORT") {
        return # Skip PORT as it is reserved in Cloud Run
    }
    
    $EnvVars += "$key=$value"
}

$EnvString = $EnvVars -join ","

Write-Host "Deploying $ServiceName to Cloud Run ($Region)..." -ForegroundColor Green

# Use source deploy
gcloud run deploy $ServiceName `
    --source . `
    --region $Region `
    --set-env-vars $EnvString `
    --allow-unauthenticated `
    --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment Successful!" -ForegroundColor Green
}
else {
    Write-Host "Deployment Failed!" -ForegroundColor Red
    exit 1
}
