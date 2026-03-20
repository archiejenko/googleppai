import { useState } from 'react';
import { X, TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabase';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  seatCount?: number;
}

const FEATURES = [
  'Live Call Scoring with real-time objection detection',
  'Pipeline Health with signal-adjusted probabilities',
  'Competitive Intelligence & battlecard insights',
  'Missed Revenue Recovery dashboard',
  'Business Synergies & cross-account co-sell',
  'CRM Automation triggered from call signals',
  'Prospect Profile enrichment from call data',
];

export default function UpgradeModal({ open, onClose, seatCount = 1 }: UpgradeModalProps) {
  const [seats, setSeats] = useState(seatCount);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');

  const handleStripeUpgrade = async () => {
    setStripeLoading(true);
    setStripeError('');
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: { tier: 'revenue_intelligence', seat_count: seats, triggered_from: 'upgrade_modal' },
    });
    setStripeLoading(false);
    if (data?.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setStripeError(
      error ? 'Checkout unavailable — use the form below to contact our team.' : ''
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const { error } = await supabase.functions.invoke('upgrade-request', {
      body: { requested_tier: 'revenue_intelligence', seats, message },
    });

    if (error) {
      setErrorMsg('Submission failed. Please try again or contact sales@oast.ai');
      setStatus('error');
    } else {
      setStatus('success');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setMessage('');
    setSeats(seatCount);
    setErrorMsg('');
    setStripeError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] w-full max-w-lg pointer-events-auto shadow-[8px_8px_0px_0px_rgb(var(--accent-primary))]">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border-default))]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[rgb(var(--accent-primary)/0.1)] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[rgb(var(--accent-primary))]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">
                      Revenue Intelligence
                    </h2>
                    <p className="text-[10px] text-[rgb(var(--text-muted))]">£185/user/month</p>
                  </div>
                </div>
                <button onClick={handleClose} className="p-1 hover:bg-[rgb(var(--bg-raised))] transition-colors">
                  <X className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                </button>
              </div>

              {status === 'success' ? (
                <div className="p-8 text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-[rgb(var(--status-success))] mx-auto" />
                  <h3 className="text-lg font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">
                    Request Sent
                  </h3>
                  <p className="text-sm text-[rgb(var(--text-muted))]">
                    Our sales team will contact you within 1 business day to complete your upgrade.
                  </p>
                  <button onClick={handleClose} className="btn-primary w-full">
                    Close
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  {/* Feature list */}
                  <div className="space-y-2">
                    {FEATURES.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[rgb(var(--text-secondary))]">
                        <CheckCircle className="w-3 h-3 text-[rgb(var(--accent-primary))] mt-0.5 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* Seats picker */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">
                      Number of Seats
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={seats}
                      onChange={e => setSeats(Number(e.target.value))}
                      className="input-os w-full"
                    />
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mt-1">
                      Estimated: <span className="text-[rgb(var(--accent-primary))]">£{(185 * seats).toLocaleString('en-GB')}/mo</span>
                    </p>
                  </div>

                  {/* Primary: Stripe Checkout */}
                  {stripeError && (
                    <p className="text-xs text-[rgb(var(--status-danger))]">{stripeError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleStripeUpgrade}
                    disabled={stripeLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {stripeLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                      : 'Upgrade Now'}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[rgb(var(--border-default))]" />
                    <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))]">or</span>
                    <div className="flex-1 h-px bg-[rgb(var(--border-default))]" />
                  </div>

                  {/* Secondary: manual request form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">
                        Message (optional)
                      </label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={3}
                        placeholder="Any specific requirements or questions..."
                        className="input-os w-full resize-none text-sm"
                      />
                    </div>

                    {status === 'error' && (
                      <p className="text-xs text-[rgb(var(--status-danger))]">{errorMsg}</p>
                    )}

                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="btn-ghost w-full border border-[rgb(var(--border-default))] py-2 text-xs uppercase tracking-widest text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
                    >
                      {status === 'submitting' ? 'Sending…' : 'Contact sales instead'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
