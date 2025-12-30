# db_setup.ps1
# This script runs database migrations and seeding on Cloud Run using the deployed image and secrets.

$ErrorActionPreference = "Stop"

$SecretsFile = "$PSScriptRoot/secrets.env"
$Region = "europe-west2"
if (-not (Test-Path $SecretsFile)) {
    Write-Host "❌ secrets.env not found!" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Fetching latest image from deployed service..." -ForegroundColor Cyan
$ImageName = gcloud run services describe "pitchperfectai-backend" --region $Region --format='value(spec.template.spec.containers[0].image)'
$CloudSqlInstance = "gen-lang-client-0916212640:europe-west2:pitch-perfect-ai"

if (-not $ImageName) {
    Write-Host "❌ Could not determine image name from service!" -ForegroundColor Red
    exit 1
}
Write-Host "   Using Image: $ImageName"

Write-Host "🔒 Reading secrets..." -ForegroundColor Cyan
$EnvVars = @()
Get-Content $SecretsFile | Where-Object { $_ -match '=' -and -not ($_ -match '^#') } | ForEach-Object {
    $parts = $_ -split '=', 2
    $key = $parts[0].Trim()
    $val = $parts[1].Trim()
    # Escape commas for gcloud
    $val = $val -replace ",", "\,"
    $EnvVars += "$key=$val"
}
$EnvString = $EnvVars -join ","

# 1. Migration Job
$MigrateJobName = "migrate-db-final"
Write-Host "🐘 Creating/Updating Migration Job: $MigrateJobName" -ForegroundColor Cyan

# Create or Update Job
# We use --force to update if exists (or we can use update command, but create --replace is often easier or we check existence)
# gcloud run jobs deploy is the newer command that handles create/update
# But let's stick to create with replacing or updating if simpler.
# Actually `gcloud run jobs update` if exists, `create` if not.
# Let's try `create` and if it fails (already exists), `update`.
# Or simpler: `gcloud run jobs deploy` (if available in this version? assume yes or stick to create/update explicitly)
# The prompt used `create`. Let's use `update` if it exists. But maybe just delete and create is safest to ensure fresh env.

Write-Host "   Deleting old job if exists..."
try {
    gcloud run jobs delete $MigrateJobName --region $Region --quiet 2>&1 | Out-Null
}
catch {
    Write-Host "   (No existing job to delete or delete failed, continuing)" -ForegroundColor Gray
}
$LASTEXITCODE = 0 # Reset exit code just in case

Write-Host "   Creating new migration job..."
gcloud run jobs create $MigrateJobName `
    --image $ImageName `
    --region $Region `
    --set-cloudsql-instances $CloudSqlInstance `
    --set-env-vars $EnvString `
    --command "npx" `
    --args "prisma,migrate,deploy"

if ($LASTEXITCODE -ne 0) { 
    Write-Error "Failed to create migration job"
    exit 1 
}

Write-Host "🚀 Executing Migration..." -ForegroundColor Green
gcloud run jobs execute $MigrateJobName --region $Region --wait

if ($LASTEXITCODE -ne 0) { Write-Error "Migration failed"; exit 1 }

# 2. Seed Job
$SeedJobName = "seed-db-final"
Write-Host "🌱 Creating/Updating Seed Job: $SeedJobName" -ForegroundColor Cyan

Write-Host "   Deleting old job if exists..."
try {
    gcloud run jobs delete $SeedJobName --region $Region --quiet 2>&1 | Out-Null
}
catch {
    Write-Host "   (No existing job to delete, continuing)" -ForegroundColor Gray
}

Write-Host "   Creating new seed job..."
gcloud run jobs create $SeedJobName `
    --image $ImageName `
    --region $Region `
    --set-cloudsql-instances $CloudSqlInstance `
    --set-env-vars $EnvString `
    --command "npx" `
    --args "prisma,db,seed"

if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create seed job"; exit 1 }

Write-Host "🚀 Executing Seed..." -ForegroundColor Green
gcloud run jobs execute $SeedJobName --region $Region --wait

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Database Migration and Seeding Completed Successfully!" -ForegroundColor Green
}
else {
    Write-Host "❌ Seeding failed." -ForegroundColor Red
    exit 1
}
