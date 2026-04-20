import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export const CONSENT_TEXT_V1 = `This session will record and analyse your call audio to generate performance scores and coaching insights. Recording is processed by Deepgram for transcription and by Anthropic Claude for scoring. Audio is not stored permanently. Transcripts and scores are retained for coaching purposes. You can withdraw from recording at any time by ending the session. Do you consent to this session being recorded and analysed?`;

export const CONSENT_VERSION = '1.0';

interface PreCallConsentProps {
    sessionId: string;
    orgId: string;
    onConsentGiven: () => void;
    onConsentDeclined: () => void;
}

export default function PreCallConsent({ sessionId, orgId, onConsentGiven, onConsentDeclined }: PreCallConsentProps) {
    const { session } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const logConsent = async (consentGiven: boolean) => {
        if (!session?.user?.id) return false;
        setSubmitting(true);
        setError(null);

        const { error: insertError } = await supabase
            .from('call_consent_log')
            .insert({
                org_id: orgId,
                user_id: session.user.id,
                session_id: sessionId,
                consent_given: consentGiven,
                consent_text: CONSENT_TEXT_V1,
                consent_version: CONSENT_VERSION,
                user_agent: navigator.userAgent,
            });

        setSubmitting(false);

        if (insertError) {
            setError('Unable to log consent. Recording cannot start.');
            return false;
        }
        return true;
    };

    const handleConsent = async () => {
        const ok = await logConsent(true);
        if (ok) onConsentGiven();
    };

    const handleDecline = async () => {
        await logConsent(false);
        onConsentDeclined();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="bg-bg-surface border border-border shadow-brutal p-6 max-w-md w-full mx-4 space-y-5">
                <h2 className="text-sm uppercase tracking-[0.2em] text-text-primary">Recording Consent</h2>

                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                    {CONSENT_TEXT_V1}
                </p>

                {error && (
                    <p className="text-xs text-status-danger">{error}</p>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <button
                        onClick={handleConsent}
                        disabled={submitting}
                        className="btn-primary flex-1 py-2 text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                        {submitting ? 'Logging...' : 'I Consent'}
                    </button>
                    <button
                        onClick={handleDecline}
                        disabled={submitting}
                        className="btn-ghost flex-1 py-2 text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
