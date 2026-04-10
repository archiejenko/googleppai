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

  // ElevenLabs voices
  ELEVENLABS_VOICES: [
    { id: '5PEXwsADjqmz7GO58o3B', name: 'Julian', gender: 'male',   accent: 'British', style: 'Raspy, dramatic'      },
    { id: 'rfkTsdZrVWEVhDycUYn9', name: 'Shelby', gender: 'female', accent: 'British', style: 'Clear, conversational' },
    { id: 'jRAAK67SEFE9m7ci5DhD', name: 'Ollie',  gender: 'male',   accent: 'British', style: 'Natural, relaxed'      },
  ] as const,
  ELEVENLABS_DEFAULT_VOICE_ID: '5PEXwsADjqmz7GO58o3B', // Julian
} as const;
