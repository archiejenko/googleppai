-- Migration: add missing database indexes for core query paths

-- live_scores query path (useFillerWords, useCallQuestions, useMeetingAnalytics, useCallPacing)
CREATE INDEX IF NOT EXISTS idx_live_scores_rep_id ON public.live_scores (rep_id);
CREATE INDEX IF NOT EXISTS idx_live_scores_call_id ON public.live_scores (call_id);

-- rep_correlation_snapshots — Transfer Gap north star query (TransferGapHero.tsx, correlation-engine)
CREATE INDEX IF NOT EXISTS idx_rep_corr_user_id ON public.rep_correlation_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_rep_corr_org_id ON public.rep_correlation_snapshots (org_id);
CREATE INDEX IF NOT EXISTS idx_rep_corr_transfer_gap ON public.rep_correlation_snapshots (transfer_gap_overall);

-- pitches query path (Profile.tsx, ActiveTraining.tsx, AdminDashboard.tsx)
CREATE INDEX IF NOT EXISTS idx_pitches_user_id ON public.pitches (user_id);
CREATE INDEX IF NOT EXISTS idx_pitches_org_id ON public.pitches (org_id);

-- training_sessions (Team.tsx, training analytics)
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON public.training_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_org_id ON public.training_sessions (org_id);

-- prospect_profiles FK (revenue intelligence queries)
CREATE INDEX IF NOT EXISTS idx_prospect_profiles_org_id ON public.prospect_profiles (org_id);

-- call_consent_log index already created in 20260412000001_call_consent_log.sql
