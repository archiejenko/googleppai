import { useState } from 'react';
import { supabase } from '../../utils/supabase';

const CONSENT_TEXT =
  'This call will be recorded and analysed by OAST\'s AI coaching platform for sales training purposes. ' +
  'Please confirm the call participant has been informed.';

interface PreCallConsentProps {
  userId: string;
  callId?: string;
  sessionType?: string;
  onConsented: () => void;
  onCancel: () => void;
}

/**
 * PreCallConsent
 *
 * Must be shown before any live recording or Deepgram STT session begins.
 * The rep must explicitly confirm the call participant has been informed
 * that the call will be AI-analysed. This confirmation is logged to
 * call_consent_log for GDPR Article 6 compliance.
 *
 * The parent component must not open the Deepgram WebSocket until
 * onConsented() has been called by this component.
 */
export function PreCallConsent({
  userId,
  callId,
  sessionType,
  onConsented,
  onCancel,
}: PreCallConsentProps) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!checked) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('call_consent_log')
      .insert({
        user_id: userId,
        call_id: callId ?? null,
        consent_text: CONSENT_TEXT,
        session_type: sessionType ?? null,
      });

    if (insertError) {
      console.error('[PreCallConsent] Failed to log consent:', insertError.message);
      setError('Failed to record consent. Please try again.');
      setSaving(false);
      return;
    }

    setSaving(false);
    onConsented();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <h2 id="consent-title" className="text-lg font-semibold text-gray-900 mb-3">
          Before you start recording
        </h2>

        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          {CONSENT_TEXT}
        </p>

        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-black"
          />
          <span className="text-sm text-gray-800">
            I confirm the call participant has been informed that this call will be
            recorded and AI-analysed by OAST.
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!checked || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Starting…' : 'Start Recording'}
          </button>
        </div>
      </div>
    </div>
  );
}
