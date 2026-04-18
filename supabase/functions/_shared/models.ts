/** Centralised AI model constants — update here to upgrade across all functions. */
export const MODELS = {
  // High-value reasoning: training simulation, pitch analysis, call prep, deal correlation
  ANTHROPIC_DEFAULT: "claude-sonnet-4-5",

  // High-volume / lower-complexity: drill evaluation, commodity tasks
  OPENAI_DEFAULT: "gpt-4o-mini",

  // Text-to-speech
  OPENAI_TTS: "tts-1",
  OPENAI_TTS_VOICE: "onyx",

  // Deepgram Aura-2 voices
  DEEPGRAM_VOICES: [
    { id: 'aura-2-draco-en',   name: 'Draco',   gender: 'male',   accent: 'British', style: 'Deep, authoritative' },
    { id: 'aura-2-pandora-en', name: 'Pandora', gender: 'female', accent: 'British', style: 'Clear, professional'  },
  ] as const,
  DEEPGRAM_DEFAULT_VOICE_ID: 'aura-2-draco-en',
} as const;
