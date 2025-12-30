# Supabase Connection Setup

To correctly connect your Cloud Run backend to Supabase, you need the correct connection string.

1.  **Go to Supabase Dashboard**: Open your project.
2.  **Settings**: Click on the "Settings" icon (cogwheel) -> "Database".
3.  **Connection Strings**:
    *   Look for the **"Transaction Pooler"** configuration (usually port 6543).
    *   This is the best mode for serverless environments like Cloud Run.
4.  **Copy the URI**:
    *   It will look like: `postgres://[user]:[password]@[host]:6543/postgres?pgbouncer=true`
    *   **Important**: You must replace `[password]` with your actual database password.

## Environment Variables

When running the environment update command provided by `deploy.ps1`, use this Transaction Pooler URI for `DATABASE_URL`.
