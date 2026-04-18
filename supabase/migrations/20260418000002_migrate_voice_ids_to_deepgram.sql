-- Migrate any profiles still using ElevenLabs voice IDs to the Deepgram default
UPDATE profiles
SET preferred_voice_id = 'aura-2-draco-en'
WHERE preferred_voice_id IN (
  '5PEXwsADjqmz7GO58o3B',
  'rfkTsdZrVWEVhDycUYn9',
  'jRAAK67SEFE9m7ci5DhD'
);
