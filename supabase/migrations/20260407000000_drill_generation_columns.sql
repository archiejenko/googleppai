-- Add drill-generation support columns to training_sessions

ALTER TABLE training_sessions
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'drill'));

ALTER TABLE training_sessions
  ADD COLUMN drill_trigger_id UUID REFERENCES coaching_triggers(id) ON DELETE SET NULL;
