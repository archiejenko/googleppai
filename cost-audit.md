# OAST Antigravity — Cost Audit (Single User Session)

> Generated 2026-04-21 from actual Edge Function source code.

## Pricing Reference (as of April 2026)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|----------------------|
| GPT-4.1 | $2.00 | $8.00 |
| GPT-4o | $2.50 | $10.00 |
| GPT-4o-mini | $0.15 | $0.60 |
| Deepgram Nova-2 (STT) | $0.0043/min | — |
| Deepgram Aura-2 (TTS) | $0.0060/1K chars | — |

## Per-Function Breakdown

| Function | Model | System Prompt (chars → tokens) | Input Tokens (est) | Output Tokens (est) | Cost Per Call |
|----------|-------|-------------------------------|--------------------|--------------------|--------------|
| `chat-ai` | GPT-4.1 | 553 chars → 138 tok | 800 (system + history + msg) | 50 (1-3 sentences) | **$0.0020** |
| `pitch-api` | GPT-4o | 880 chars → 220 tok | 1,500 (system + transcript) | 500 (MEDDIC JSON) | **$0.0088** |
| `training-api` | GPT-4o-mini | inline prompt ~400 chars → 100 tok | 800 (prompt + transcript) | 200 (scores JSON) | **$0.0002** |
| `drill-generation` | GPT-4o-mini | inline prompt ~900 chars → 225 tok | 350 (prompt + context) | 300 (scenario JSON, max_tokens=400) | **$0.0002** |
| `tts-generate` | Deepgram Aura-2 | — | ~150 chars per AI response | audio stream | **$0.0009** |
| `deepgram-token` | — | — | — | — | $0.00 (just issues key) |
| STT (via `useDeepgramSTT`) | Deepgram Nova-2 | — | streaming audio | text | **$0.0043/min** |

### Notes on estimates

- **chat-ai**: `ESTIMATED_TOKENS = 2000` in source (800 prompt + 1200 max). Actual output for "under 3 sentences" is ~50 tokens; history grows per turn. 800 input is a mid-session average.
- **pitch-api**: `ESTIMATED_TOKENS = 3500` in source (1500 prompt + 2000 max). Typical transcript is 500-1000 words. Output is structured MEDDIC JSON with 6 scores + breakdown.
- **training-api**: `AI_ESTIMATED_TOKENS = 1500` in source. Only fires on `action: 'complete'` with messages.
- **drill-generation**: `max_tokens: 400` explicitly set. Input is a scenario design prompt with rep context.
- **TTS**: AI responses average ~150 chars (1-3 short sentences). Voice model is `aura-2-draco-en` or `aura-2-pandora-en`.
- **STT**: Uses Nova-2 via WebSocket (`useDeepgramSTT.ts`), linear16 @ 16kHz, with endpointing at 300ms.

## Deepgram Usage Map

| Endpoint / Hook | Service | Model / Config |
|----------------|---------|---------------|
| `supabase/functions/deepgram-token/index.ts` | STT token issuer | Issues 10s TTL keys for Nova-2 WebSocket |
| `supabase/functions/tts-generate/index.ts` | TTS | Aura-2 (`aura-2-draco-en` default) via REST `/v1/speak` |
| `src/hooks/useDeepgramSTT.ts` | STT (client) | Nova-2, `wss://api.deepgram.com/v1/listen`, 16kHz linear16 |
| `src/components/live/OastLiveWidget.tsx` | STT (live scoring) | References Deepgram (live call analysis) |

## Cost Per Session Type

### 1. Training Session (voice-enabled, ~5 min roleplay)

| Step | Function | Calls | Cost |
|------|----------|-------|------|
| Create session | `training-api` | 1 | $0.00 (no AI) |
| User speaks (STT) | Deepgram Nova-2 | 5 min | $0.0215 |
| AI roleplay responses | `chat-ai` (GPT-4.1) | 10 | $0.0200 |
| Voice AI responses (TTS) | `tts-generate` (Aura-2) | 10 | $0.0090 |
| Complete + score | `training-api` (GPT-4o-mini) | 1 | $0.0002 |
| Generate drill | `drill-generation` (GPT-4o-mini) | 1 | $0.0002 |
| **TOTAL** | | | **$0.0509** |

### 2. Recorded Call Analysis (~15 min call)

| Step | Function | Calls | Cost |
|------|----------|-------|------|
| Live STT transcription | Deepgram Nova-2 | 15 min | $0.0645 |
| MEDDIC pitch analysis | `pitch-api` (GPT-4o) | 1 | $0.0088 |
| **TOTAL** | | | **$0.0733** |

### 3. Text-Only Training Session (no voice, ~10 messages)

| Step | Function | Calls | Cost |
|------|----------|-------|------|
| Create session | `training-api` | 1 | $0.00 |
| AI roleplay responses | `chat-ai` (GPT-4.1) | 10 | $0.0200 |
| Complete + score | `training-api` (GPT-4o-mini) | 1 | $0.0002 |
| Generate drill | `drill-generation` (GPT-4o-mini) | 1 | $0.0002 |
| **TOTAL** | | | **$0.0204** |

## Summary

| Metric | Cost |
|--------|------|
| Voice training session | ~$0.05 |
| Text-only training session | ~$0.02 |
| Recorded call analysis (15 min) | ~$0.07 |
| 100 voice sessions/month | ~$5.09 |
| 100 call analyses/month | ~$7.33 |
| **Blended 100 sessions + 50 analyses** | **$8.76** |

The dominant cost driver is **Deepgram STT** for voice sessions and **GPT-4.1** for chat roleplay. GPT-4o-mini functions (`training-api`, `drill-generation`) are negligible at <$0.001 per call.
