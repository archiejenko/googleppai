# Pitch Perfect AI - Deployment Guide

## Architecture

- **Frontend**: Netlify (React + Vite)
- **Backend**: Google Cloud Run (Node.js + Express)
- **Database**: PostgreSQL (Cloud SQL or external)
- **Storage**: Google Cloud Storage
- **AI**: Google Gemini API

---

## 🚀 Quick Deployment

### 1. Deploy Backend to Cloud Run

```bash
cd server

# Build and deploy
gcloud run deploy pitchperfectai-backend \
  --source . \
  --region europe-west2 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

**Set environment variables:**
```bash
gcloud run services update pitchperfectai-backend \
  --region europe-west2 \
  --set-env-vars DATABASE_URL="your-postgresql-url" \
  --set-env-vars JWT_SECRET="your-secret-key" \
  --set-env-vars GEMINI_API_KEY="your-gemini-key" \
  --set-env-vars GCS_BUCKET_NAME="your-bucket-name" \
  --set-env-vars FRONTEND_URL="https://your-netlify-app.netlify.app"
```

**Get your backend URL:**
```bash
gcloud run services describe pitchperfectai-backend --region europe-west2 --format='value(status.url)'
```

### 2. Deploy Frontend to Netlify

**Option A: Using Netlify CLI**
```bash
cd client

# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to existing site
netlify link --id 518d462d-ab0f-4809-a2a7-863ee3df443f

# Set environment variable
netlify env:set VITE_API_URL "https://your-backend-url.run.app"

# Deploy
netlify deploy --prod
```

**Option B: Using Netlify Dashboard**
1. Go to https://app.netlify.com/sites/518d462d-ab0f-4809-a2a7-863ee3df443f
2. Go to **Site configuration** → **Environment variables**
3. Add: `VITE_API_URL` = `https://your-backend-url.run.app`
4. Go to **Deploys** → **Trigger deploy** → **Deploy site**

---

## 📋 Environment Variables

### Backend (Cloud Run)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | ✅ Yes |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ Yes |
| `GCS_BUCKET_NAME` | Google Cloud Storage bucket name | ✅ Yes |
| `FRONTEND_URL` | Netlify app URL for CORS | ✅ Yes |
| `PORT` | Server port (auto-set by Cloud Run) | ⚙️ Auto |
| `NODE_ENV` | Environment mode | ⚙️ Auto |

### Frontend (Netlify)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL from Cloud Run | ✅ Yes |

---

## 🔧 Configuration Files Created

✅ **netlify.toml** - Netlify build configuration  
✅ **server/Dockerfile** - Cloud Run container configuration  
✅ **server/.dockerignore** - Docker build optimization  
✅ **client/src/utils/api.ts** - Updated for environment variables  
✅ **server/src/app.ts** - Updated CORS for production  

---

## 🗄️ Database Setup

### Option 1: Cloud SQL (Recommended for Production)

```bash
# Create Cloud SQL instance
gcloud sql instances create pitchperfect-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west2

# Create database
gcloud sql databases create pitchperfect \
  --instance=pitchperfect-db

# Get connection name
gcloud sql instances describe pitchperfect-db --format='value(connectionName)'
```

**Connection string format:**
```
postgresql://user:password@/pitchperfect?host=/cloudsql/CONNECTION_NAME
```

### Option 2: External PostgreSQL (Supabase, Railway, etc.)

Use the connection string provided by your database provider.

### Run Migrations

```bash
cd server
npx prisma migrate deploy
```

---

## 🪣 Google Cloud Storage Setup

```bash
# Create bucket
gsutil mb -l europe-west2 gs://pitchperfect-audio-files

# Set CORS for bucket
echo '[{"origin": ["https://your-netlify-app.netlify.app"], "method": ["GET", "POST"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600}]' > cors.json
gsutil cors set cors.json gs://pitchperfect-audio-files

# Set bucket permissions (if needed)
gsutil iam ch allUsers:objectViewer gs://pitchperfect-audio-files
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Backend health check: `https://your-backend.run.app/health`
- [ ] Frontend loads: `https://your-app.netlify.app`
- [ ] Can register a new account
- [ ] Can login successfully
- [ ] Can record a pitch
- [ ] Can view MEDDIC analysis
- [ ] Premium UI displays correctly (gradients, glassmorphism)
- [ ] All 6 MEDDIC components show scores

---

## 🔄 Redeployment

### Update Backend
```bash
cd server
gcloud run deploy pitchperfectai-backend --source . --region europe-west2
```

### Update Frontend
```bash
cd client
netlify deploy --prod
```

Or push to your Git repository if auto-deploy is enabled.

---

## 🐛 Troubleshooting

### Backend Issues

**Check logs:**
```bash
gcloud run services logs read pitchperfectai-backend --region europe-west2
```

**Common issues:**
- Database connection: Verify `DATABASE_URL` is correct
- Prisma errors: Run `npx prisma generate` and redeploy
- CORS errors: Ensure `FRONTEND_URL` matches your Netlify domain

### Frontend Issues

**Check build logs:**
```bash
netlify logs
```

**Common issues:**
- API calls fail: Verify `VITE_API_URL` is set correctly
- Blank page: Check browser console for errors
- 404 on refresh: Netlify redirects are configured in `netlify.toml`

---

## 📊 Monitoring

### Cloud Run Metrics
View in Google Cloud Console:
- Request count
- Request latency
- Error rate
- Container instances

### Netlify Analytics
View in Netlify Dashboard:
- Page views
- Unique visitors
- Build times
- Deploy frequency

---

## 💰 Cost Estimation

### Free Tier Limits
- **Cloud Run**: 2 million requests/month
- **Netlify**: 100 GB bandwidth/month
- **Cloud SQL**: db-f1-micro is ~$7/month
- **Cloud Storage**: First 5GB free

**Estimated monthly cost for MVP**: $10-20/month

---

## 🔐 Security Checklist

- [ ] JWT_SECRET is strong (32+ random characters)
- [ ] Database has strong password
- [ ] Environment variables are not in code
- [ ] CORS is configured for specific domain
- [ ] Cloud Storage bucket has proper permissions
- [ ] API rate limiting is configured (future enhancement)

---

## 📞 Support

If you encounter issues:
1. Check logs (Cloud Run and Netlify)
2. Verify environment variables
3. Test backend health endpoint
4. Check database connectivity
5. Review CORS configuration
