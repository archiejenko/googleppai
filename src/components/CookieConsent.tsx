import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initPostHog } from '../lib/posthog';

const CONSENT_KEY = 'oast_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(CONSENT_KEY));

  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY) === 'accepted') {
      initPostHog(); // safe: _initialized guard prevents double-init
    }
    // 'rejected' or unset → do nothing here
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    initPostHog();
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border-default">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex-1">
          <span className="label-os text-xs tracking-widest text-text-primary block mb-1">
            COOKIE NOTICE
          </span>
          <p
            className="text-sm text-text-secondary font-body"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
          >
            We use analytics cookies to improve OAST. You can decline and nothing will be tracked.{' '}
            <Link
              to="/privacy-policy"
              className="text-accent underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={decline}
            className="btn-ghost px-6 py-2 text-xs tracking-widest"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="bg-accent text-black px-6 py-2 text-xs tracking-widest font-semibold hover:opacity-90 transition-opacity"
            style={{ borderRadius: 0 }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
