# Environment Variables & Deployment Guide

## Environment Variables

### Backend (Server)
These variables must be set in the deployment environment (e.g., Cloud Run, Render, Railway) or `server/secrets.env` for local.

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL of your Supabase project (from "oast" project) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for backend access (Privileged!) |
| `GEMINI_API_KEY` | API Key for Google Gemini (AI features) |
| `ADMIN_INITIAL_PASSWORD` | Password for the initial admin account (for setup endpoints) |
| `SUPABASE_STORAGE_BUCKET` | (Optional) Storage bucket name. Default: `pitch-recordings` |
| `PORT` | (Optional) Port to listen on. Default: 3000 |
| `FRONTEND_URL` | (Optional) URL of the frontend for CORS. Default: localhost |

### Frontend (Client / Netlify)
These variables must be set in Netlify "Site configuration > Environment variables".

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | The URL of your Supabase project (from Settings > API) |
| `VITE_SUPABASE_ANON_KEY` | The `anon` public key (from Settings > API) |

## Deployment Configuration

### Netlify (Frontend)
- **Repo**: Connect to your GitHub repo.
- **Base directory**: `client`
- **Build command**: `npm run build`
- **Publish directory**: `client/dist` (or `dist` relative to base)
- **Environment Variables**: Add `VITE_API_URL`.

### Backend
- Deploy the `server` directory.
- Ensure all Backend variables listed above are set.
- Ensure the service has public internet access (for Supabase/Gemini calls).

## Secrets Management
- **Local**: Use `server/secrets.env` (never committed).
- **Production**: Use platform-specific secret storage.
- **Checklist**:
  - [ ] Rotate keys if they were previously exposed in git.
  - [ ] Ensure `VITE_` vars are NOT secrets (they are bundled in JS).
