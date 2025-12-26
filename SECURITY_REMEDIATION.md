# Security Remediation Plan

## 1. Secrets in Git History
**Status**: Secrets were found in tracked files (`server/temp_vars.md`, `server/service.json`).
**Risk**: Even though these files are deleted from the working tree, they exist in the git history and can be recovered by anyone with access to the repo.

### **Remediation Steps (Run these commands)**
1. **Install BFG Repo-Cleaner** (Recommended for ease of use) or use `git filter-repo`.
   ```bash
   # Example using BFG
   java -jar bfg.jar --delete-files service.json
   java -jar bfg.jar --delete-files temp_vars.md
   java -jar bfg.jar --delete-files secrets.env
   ```
2. **Rewrite History**
   ```bash
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   ```
3. **Force Push**
   ```bash
   git push --force
   ```
   *Warning*: This will overwrite the remote history. Ensure all team members re-clone the repository after this.

## 2. Key Rotation
**Status**: The exposed keys (Supabase keys, Gemini key, Service Account) must be considered COMPROMISED.
**Action**:
- [ ] **Rotate Supabase Service Role Key**: Go to Supabase Dashboard > Settings > API > Rotate Secret.
- [ ] **Rotate Supabase Anon Key**: (Auto-rotated with Service Role Key).
- [ ] **Revoke Gemini API Key**: Go to Google AI Studio > Get API key > Delete/Revoke. Generate a new one.
- [ ] **Revoke Google Service Account**: Go to GCP Console > IAM > Service Accounts > Delete key.

## 3. Environment Variable Management
- **Local**: Use `server/secrets.env` (never committed).
- **Production (Netlify/Cloud Run)**: Set environment variables in the respective platform dashboards.

## 4. Validation
- Run `git ls-files | grep "secrets"` to ensure no secret files are tracked.
- Verify `server/package.json` does not contain `@google-cloud/*` dependencies.
