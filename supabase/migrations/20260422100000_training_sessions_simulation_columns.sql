-- Add simulation-specific columns to training_sessions for layered prompt assembly.
-- All nullable for backward compatibility with existing sessions.

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.simulated_companies(id) ON DELETE SET NULL;

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS persona_id uuid REFERENCES public.simulated_personas(id) ON DELETE SET NULL;

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS call_stage text;

DO $$ BEGIN
  ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_call_stage_check
    CHECK (call_stage IN ('cold_call', 'discovery', 'evaluation', 'negotiation'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS call_focus text;

CREATE INDEX IF NOT EXISTS idx_training_sessions_company_id
  ON public.training_sessions (company_id);

CREATE INDEX IF NOT EXISTS idx_training_sessions_persona_id
  ON public.training_sessions (persona_id);
