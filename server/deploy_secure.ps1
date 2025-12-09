# deploy_secure.ps1
# This script reads secrets from secrets.env and deploys to Cloud Run with those environment variables.

$ErrorActionPreference = "Stop"

$SecretsFile = "$PSScriptRoot/secrets.env"
$ServiceName = "pitchperfectai-backend"
$Region = "europe-west2"
$ImageName = "europe-west2-docker.pkg.dev/gen-lang-client-0916212640/cloud-run-source-deploy/pitchperfectai-backend"

if (-not (Test-Path $SecretsFile)) {
    Write-Host "❌ secrets.env not found!" -ForegroundColor Red
    exit 1
}

Write-Host "🔒 Reading secrets from secrets.env..." -ForegroundColor Cyan

# Read and parse secrets
$EnvVars = @()
Get-Content $SecretsFile | Where-Object { $_ -match '=' -and -not ($_ -match '^#') } | ForEach-Object {
    $parts = $_ -split '=', 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    
    # Check for placeholders
    if ($value -match "\[YOUR_.*\]") {
        Write-Host "⚠️  Warning: Placeholder found for $key. Please update secrets.env with real values." -ForegroundColor Yellow
        exit 1
    }
    
    $EnvVars += "$key=$value"
}

$EnvString = $EnvVars -join ","

Write-Host "🚀 Deploying $ServiceName to Cloud Run with updated secrets..." -ForegroundColor Green

# Deploy command
# Note: We are updating the service with the new environment variables
# We assume the image is already built/deployed or we can trigger a new build if needed.
# For now, let's just update the configuration of the existing service to be safe, 
# or do a full deploy if you prefer. A full deploy ensures the image is fresh.

gcloud run deploy $ServiceName `
    --source . `
    --region $Region `
    --set-env-vars $EnvString `
    --allow-unauthenticated `
    --quiet

Write-Host "Gcloud Exit Code: $LASTEXITCODE"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment and Secret Update Successful!" -ForegroundColor Green
    Write-Host "The application now has access to the secrets defined in your local secrets.env file."
}
else {
    Write-Host ""
    Write-Host "❌ Deployment failed." -ForegroundColor Red
}
