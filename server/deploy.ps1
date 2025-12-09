# Pitch Perfect AI - Backend Deployment Script (PowerShell)
# This script deploys the backend to Google Cloud Run

Write-Host "🚀 Starting Backend Deployment to Cloud Run..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = "gen-lang-client-0916212640"
$REGION = "europe-west2"
$SERVICE_NAME = "pitchperfectai-backend"
$CLOUDSQL_INSTANCE = "gen-lang-client-0916212640:europe-west2:pitch-perfect-ai"

# Check if we're in the server directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the server directory" -ForegroundColor Red
    Write-Host "   cd server" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Building and deploying to Cloud Run..." -ForegroundColor Green
Write-Host "   Region: $REGION"
Write-Host "   Service: $SERVICE_NAME"
Write-Host ""

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME `
  --source . `
  --region $REGION `
  --allow-unauthenticated `
  --add-cloudsql-instances $CLOUDSQL_INSTANCE `
  --set-env-vars NODE_ENV=production `
  --memory 512Mi `
  --cpu 1 `
  --timeout 300 `
  --max-instances 10

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Set environment variables (see below)"
    Write-Host "2. Get your backend URL"
    Write-Host "3. Run database migrations"
    Write-Host ""
    Write-Host "🔧 To set environment variables, run:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "gcloud run services update $SERVICE_NAME ``"
    Write-Host "  --region $REGION ``"
    Write-Host "  --set-env-vars DATABASE_URL=`"postgresql://postgres:YOUR_PASSWORD@/pitchperfect?host=/cloudsql/$CLOUDSQL_INSTANCE`" ``"
    Write-Host "  --set-env-vars JWT_SECRET=`"YOUR_JWT_SECRET`" ``"
    Write-Host "  --set-env-vars GEMINI_API_KEY=`"YOUR_GEMINI_KEY`" ``"
    Write-Host "  --set-env-vars GCS_BUCKET_NAME=`"pitchperfect-audio-files`" ``"
    Write-Host "  --set-env-vars FRONTEND_URL=`"https://your-netlify-app.netlify.app`""
    Write-Host ""
    Write-Host "🌐 To get your backend URL, run:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)'"
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}
