#!/bin/bash

# Pitch Perfect AI - Backend Deployment Script
# This script deploys the backend to Google Cloud Run

echo "🚀 Starting Backend Deployment to Cloud Run..."
echo ""

# Configuration
PROJECT_ID="gen-lang-client-0916212640"
REGION="europe-west2"
SERVICE_NAME="pitchperfectai-backend"
CLOUDSQL_INSTANCE="gen-lang-client-0916212640:europe-west2:pitch-perfect-ai"

# Check if we're in the server directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the server directory"
    echo "   cd server"
    exit 1
fi

echo "📦 Building and deploying to Cloud Run..."
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"
echo ""

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances $CLOUDSQL_INSTANCE \
  --set-env-vars NODE_ENV=production \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set environment variables (see below)"
    echo "2. Get your backend URL"
    echo "3. Run database migrations"
    echo ""
    echo "🔧 To set environment variables, run:"
    echo ""
    echo "gcloud run services update $SERVICE_NAME \\"
    echo "  --region $REGION \\"
    echo "  --set-env-vars DATABASE_URL=\"postgresql://postgres:YOUR_PASSWORD@/pitchperfect?host=/cloudsql/$CLOUDSQL_INSTANCE\" \\"
    echo "  --set-env-vars JWT_SECRET=\"YOUR_JWT_SECRET\" \\"
    echo "  --set-env-vars GEMINI_API_KEY=\"YOUR_GEMINI_KEY\" \\"
    echo "  --set-env-vars GCS_BUCKET_NAME=\"pitchperfect-audio-files\" \\"
    echo "  --set-env-vars FRONTEND_URL=\"https://your-netlify-app.netlify.app\""
    echo ""
    echo "🌐 To get your backend URL, run:"
    echo ""
    echo "gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)'"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
