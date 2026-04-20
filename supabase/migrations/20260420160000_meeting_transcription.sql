ALTER TABLE meeting_sessions ADD COLUMN IF NOT EXISTS transcript text;
ALTER TABLE meeting_sessions ADD COLUMN IF NOT EXISTS transcript_status text CHECK (transcript_status IN ('pending', 'processing', 'complete', 'failed')) DEFAULT 'pending';
ALTER TABLE meeting_sessions ADD COLUMN IF NOT EXISTS action_items jsonb;
ALTER TABLE meeting_sessions ADD COLUMN IF NOT EXISTS summary text;
