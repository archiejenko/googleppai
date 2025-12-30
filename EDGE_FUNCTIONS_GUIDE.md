# Beginner's Guide to Supabase Edge Functions

## 1. What are Edge Functions?

Imagine your application has two parts:
1.  **The Frontend (Client)**: This is what you see and touch on your screen (your React app). It lives on your user's device.
2.  **The Backend (Server)**: This is the "brain" that does the heavy lifting, stores secrets, and talks to databases.

**Edge Functions** are your new Backend. Instead of renting a big expensive computer (server) that is always on, you write small, specific pieces of code (functions) that Supabase runs for you only when needed.

## 2. Why are they Essential?

You might ask, "Why not just do everything in the Frontend app?"

### 🔒 Security (The most important reason!)
Your **API Keys** (like the Google Gemini Key) are like passwords. If you put them in your Frontend code, anyone can find them and steal them.
*   **Bad**: Frontend calls Gemini directly (Keys are exposed).
*   **Good**: Frontend asks Edge Function to call Gemini. The Edge Function runs securely on Supabase's server, so no one sees your keys.

### 🧠 Complex Logic
Some tasks are too heavy for a phone browser, or require multiple steps (like "Save to database" AND "Calculate score" AND "Email user"). Edge functions handle this reliability.

## 3. The 3 Functions in Your Project

We have created three specific functions for Pitch Perfect AI:

### A. `training-api` (The Manager)
*   **What it does:** It manages your training sessions.
*   **When it runs:**
    *   When you click "Start Training".
    *   When you click "End Session" (it calculates your XP and saves the results).

### B. `chat-ai` (The Brain)
*   **What it does:** It acts as the "Prospect" you are practicing with. It takes your text message, sends it to Google Gemini, and returns a role-played response.
*   **When it runs:** Every time you send a message in the chat.

### C. `pitch-api` (The Judge)
*   **What it does:** It listens to your recorded audio pitch, sends it to Google Gemini for analysis, and gives you a score and feedback (MEDDIC framework).
*   **When it runs:** After you finish recording a pitch and click "Analyze".

## 4. How to Deploy Them (Implementation Plan)

We have installed the Supabase CLI in your project, so you can run commands reliably using `npx`.

### Step 1: Login
Open your terminal (in the project root) and run:
```bash
npx supabase login
```
*This will open your browser to authorize.*

### Step 2: Link Your Project
Tell the CLI which project on Supabase you are working with.
**Important**: You need your **Project Reference ID** (it's the code in your Supabase URL, e.g., `https://abcdefg.supabase.co` -> `abcdefg`).
```bash
npx supabase link --project-ref your-project-ref
```
*Note: You might be asked for your database password.*

### Step 3: Set Your Secrets
Upload your secure keys so the functions can use them.
```bash
npx supabase secrets set GEMINI_API_KEY=your_actual_gemini_key
```

### Step 4: Deploy!
Push your code to the cloud.
```bash
npx supabase functions deploy training-api
npx supabase functions deploy chat-ai
npx supabase functions deploy pitch-api
```

### Success! 🎉
Once deployed, your frontend app (Netlify) can verify permissions and talk to these functions securely.
