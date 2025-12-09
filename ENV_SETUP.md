# Environment Variables Setup for Pitch Perfect AI Backend

## Required Environment Variables

After the backend successfully deploys, you need to set these environment variables with your actual values:

### 1. Database Connection String

```bash
cmd /c "gcloud run services update pitchperfectai-backend --region europe-west2 --set-env-vars DATABASE_URL=\"postgresql://postgres:YOUR_POSTGRES_PASSWORD@/pitchperfect?host=/cloudsql/gen-lang-client-0916212640:europe-west2:pitch-perfect-ai\""
```

**Replace `YOUR_POSTGRES_PASSWORD` with your actual Cloud SQL password.**

### 2. JWT Secret (for authentication tokens)

```bash
cmd /c "gcloud run services update pitchperfectai-backend --region europe-west2 --set-env-vars JWT_SECRET=\"YOUR_STRONG_SECRET_KEY_MIN_32_CHARS\""
```

**Generate a strong random secret (32+ characters). Example:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Google Gemini API Key

```bash
cmd /c "gcloud run services update pitchperfectai-backend --region europe-west2 --set-env-vars GEMINI_API_KEY=\"YOUR_GEMINI_API_KEY\""
```

**Get your Gemini API key from:** https://makersuite.google.com/app/apikey

### 4. Google Cloud Storage Bucket

```bash
cmd /c "gcloud run services update pitchperfectai-backend --region europe-west2 --set-env-vars GCS_BUCKET_NAME=\"pitchperfect-audio-files\""
```

(This one is already correct)

### 5. Frontend URL (for CORS)

```bash
cmd /c "gcloud run services update pitchperfectai-backend --region europe-west2 --set-env-vars FRONTEND_URL=\"https://YOUR_NETLIFY_SITE.netlify.app\""
```

**You'll get this after deploying the frontend to Netlify.**

---

## All-in-One Command

Once you have all values, you can set them all at once:

```bash
cmd /c "gcloud run services update pitchperfectai-backend --region europe-west2 --set-env-vars DATABASE_URL=\"postgresql://postgres:YOUR_PASSWORD@/pitchperfect?host=/cloudsql/gen-lang-client-0916212640:europe-west2:pitch-perfect-ai\" --set-env-vars JWT_SECRET=\"YOUR_JWT_SECRET\" --set-env-vars GEMINI_API_KEY=\"YOUR_GEMINI_KEY\" --set-env-vars GCS_BUCKET_NAME=\"pitchperfect-audio-files\" --set-env-vars FRONTEND_URL=\"https://YOUR_NETLIFY_SITE.netlify.app\""
```

---

## Verify Environment Variables

Check what's currently set:

```bash
cmd /c "gcloud run services describe pitchperfectai-backend --region europe-west2 --format=\"value(spec.template.spec.containers[0].env)\""
```

---

## After Setting Environment Variables

Once all environment variables are set, the backend will automatically restart with the new values.

**Then run database migrations:**

```bash
cd server
npx prisma migrate deploy
```

This will create all the necessary database tables.
