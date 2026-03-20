import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface EnquiryModalProps {
    open: boolean;
    onClose: () => void;
}

export default function EnquiryModal({ open, onClose }: EnquiryModalProps) {
    const [form, setForm] = useState({ name: '', company: '', teamSize: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const backdropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        try {
            await supabase.functions.invoke('upgrade-request', {
                body: {
                    name: form.name,
                    company: form.company,
                    team_size: parseInt(form.teamSize, 10) || 0,
                    message: form.message,
                    type: 'enterprise_enquiry',
                },
            });
            setStatus('sent');
        } catch {
            setStatus('error');
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === backdropRef.current) onClose();
    };

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
        >
            <div
                className="bg-[rgb(var(--bg-surface))] border border-white/20 p-8 w-full max-w-lg relative"
                style={{ borderRadius: 0 }}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {status === 'sent' ? (
                    <div className="py-8 text-center space-y-4">
                        <p className="text-sm tracking-widest text-[rgb(var(--accent-primary))]">
                            ENQUIRY RECEIVED
                        </p>
                        <p className="text-[rgb(var(--text-secondary))] text-sm">
                            We'll be in touch within one business day.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-4 border border-white/20 px-6 py-2 text-sm tracking-widest text-[rgb(var(--text-primary))] hover:bg-white/5 transition-colors"
                            style={{ borderRadius: 0 }}
                        >
                            CLOSE
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl tracking-wide text-[rgb(var(--text-primary))] mb-2">
                            Request a Briefing
                        </h2>
                        <p className="text-sm text-[rgb(var(--text-muted))] mb-8">
                            Tell us about your organisation and we'll prepare a tailored proposal.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs tracking-widest text-[rgb(var(--text-muted))] mb-2">
                                    YOUR NAME
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="input-os w-full"
                                    placeholder="Jane Smith"
                                />
                            </div>

                            <div>
                                <label className="block text-xs tracking-widest text-[rgb(var(--text-muted))] mb-2">
                                    COMPANY
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={form.company}
                                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                                    className="input-os w-full"
                                    placeholder="Acme Corp"
                                />
                            </div>

                            <div>
                                <label className="block text-xs tracking-widest text-[rgb(var(--text-muted))] mb-2">
                                    TEAM SIZE
                                </label>
                                <input
                                    required
                                    type="number"
                                    min={1}
                                    value={form.teamSize}
                                    onChange={e => setForm(f => ({ ...f, teamSize: e.target.value }))}
                                    className="input-os w-full"
                                    placeholder="50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs tracking-widest text-[rgb(var(--text-muted))] mb-2">
                                    MESSAGE
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.message}
                                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                    className="input-os w-full resize-none"
                                    placeholder="Tell us about your team's goals and current challenges..."
                                />
                            </div>

                            {status === 'error' && (
                                <p className="text-sm text-[rgb(var(--status-danger))]">
                                    Something went wrong. Please try again or email us directly.
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'sending'}
                                className="w-full py-3 text-sm tracking-widest bg-[rgb(var(--accent-primary))] text-[rgb(var(--bg-canvas))] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ borderRadius: 0 }}
                            >
                                {status === 'sending' ? 'SENDING...' : 'SEND ENQUIRY'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
