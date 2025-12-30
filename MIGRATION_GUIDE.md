# Migration Guide: GCP to Supabase

This guide outlines the steps to complete the migration of the Pitch Perfect AI backend from Google Cloud Platform to Supabase.

## 1. Database Setup

1.  **Run Migrations:**
    Execute the SQL scripts found in `supabase/migrations/` in your Supabase Dashboard SQL Editor (or using Supabase CLI).
    - `20250101000000_initial_schema.sql` (Tables: profiles, teams, pitches, training_sessions)
    - `20250101000001_add_learning_modules.sql` (Tables: learning_modules, user_progress, skills)

2.  **Verify Row Level Security (RLS):**
    Ensure RLS policies are active on all tables as defined in the migration scripts.

## 2. Storage Setup

1.  **Create Bucket:**
    Go to Supabase Dashboard -> Storage.
    Create a new public bucket named `pitch-recordings`.

2.  **Policies:**
    Add a policy to allow authenticated users to upload files:
    - ALLOW INSERT to `pitch-recordings` for authenticated users.
    - ALLOW SELECT to `pitch-recordings` for public or authenticated users.

## 3. Edge Functions Deployment

The backend logic has been ported to Supabase Edge Functions in `supabase/functions/`.

1.  **Environment Variables:**
    Set the following secrets in your Supabase project (Dashboard -> Edge Functions -> Secrets):
    - `GEMINI_API_KEY`: Your Google Gemini API Key.
    - `SUPABASE_URL`: (Auto-set usually, but verify)
    - `SUPABASE_ANON_KEY`: (Auto-set usually)
    - `SUPABASE_SERVICE_ROLE_KEY`: (Required for some admin overrides if used)

2.  **Deploy Functions:**
    Using Supabase CLI:
    ```bash
    supabase functions deploy training-api
    supabase functions deploy chat-ai
    supabase functions deploy pitch-api
    ```

## 4. Frontend Configuration

The React frontend has been updated to use the Supabase Client directly.

1.  **Environment Variables:**
    Ensure your `client/.env` file contains:
    ```
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

2.  **Build & Deploy:**
    Deploy the client application to your hosting provider (e.g., Vercel, Netlify).
    ```bash
    cd client
    npm run build
    ```

## 5. Legacy Backend

The Node.js server in `server/` is no longer used by the frontend.
- It can be archived or deleted after successful verification of the migration.
- `client/src/utils/api.ts` is no longer used in the main application flow but remains in the codebase. You clean it up at your convenience.

## Verification Checklist

- [ ] Login/Register works via Supabase Auth.
- [ ] Dashboard loads pitches from Supabase DB.
- [ ] "Start Training" creates a session via `training-api`.
- [ ] Speaking in Active Training sends text to `chat-ai` and receives response.
- [ ] "End Session" completes the session, triggers Gemini analysis via `training-api`, and saves a Pitch.
- [ ] Pitch Recorder uploads audio to `pitch-recordings` bucket and triggers `pitch-api`.
- [ ] Profile and Team pages load data correctly.
