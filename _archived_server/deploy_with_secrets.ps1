# Read secrets from secrets.env
$envFile = "secrets.env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: secrets.env file not found!" -ForegroundColor Red
    Write-Host "   Please rename secrets.env.example to secrets.env and fill in your values."
    exit 1
}

# Parse the file
$secrets = @{}
Get-Content $envFile | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    $secrets[$key] = $value
}

# Construct the env vars string
$envString = $secrets.Keys | ForEach-Object { "$_=$($secrets[$_])" }
$envString = $envString -join ","

Write-Host "🚀 Deploying with secrets from $envFile..." -ForegroundColor Cyan

# Deploy
gcloud run deploy pitchperfectai-backend `
    --source . `
    --region europe-west2 `
    --allow-unauthenticated `
    --set-env-vars "$envString"
