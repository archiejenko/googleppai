/** Centralised AI model constants — update here to upgrade across all functions. */
export const MODELS = {
  // High-value reasoning: training simulation, pitch analysis, call prep, deal correlation
  ANTHROPIC_DEFAULT: "claude-sonnet-4-5",

  // High-volume / lower-complexity: drill evaluation, commodity tasks
  OPENAI_DEFAULT: "gpt-4o-mini",

  // Text-to-speech
  OPENAI_TTS: "tts-1",
  OPENAI_TTS_VOICE: "onyx",
  DEEPGRAM_TTS: "aura-asteria-en",
} as const;
