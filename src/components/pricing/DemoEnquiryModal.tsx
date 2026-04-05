import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface DemoEnquiryModalProps {
    open: boolean;
    onClose: () => void;
}

export default function DemoEnquiryModal({ open, onClose }: DemoEnquiryModalProps) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        company: '',
        teamSize: '',
        message: '',
    });
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const backdropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            // Reset form state when modal closes
            setStatus('idle');
            setForm({ name: '', email: '', company: '', teamSize: '', message: '' });
        }
    }, [open]);

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
            const { error } = await supabase.functions.invoke('deployment-request', {
                body: {
                    name: form.name,
                    email: form.email,
                    company: form.company,
                    team_size: parseInt(form.teamSize, 10) || 0,
                    message: form.message,
                    request_type: 'demo_request',
                },
            });
            if (error) throw error;
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
                            REQUEST RECEIVED
                        </p>
                        <p className="text-[rgb(var(--text-secondary))] text-sm">
                            Our team will be in touch within one business day.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-4 border border-white/20 px-6 py-2 text-xs tracking-widest text-[rgb(var(--text-primary))] hover:bg-white/5 transition-colors"
                            style={{ borderRadius: 0 }}
                        >
                            CLOSE
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl tracking-wide text-[rgb(var(--text-primary))] mb-2">
                            Request a Demo
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
                                    style={{ borderRadius: 0 }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs tracking-widest text-[rgb(var(--text-muted))] mb-2">
                                    WORK EMAIL
                                </label>
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="input-os w-full"
                                    placeholder="jane@company.com"
                                    style={{ borderRadius: 0 }}
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
                                    style={{ borderRadius: 0 }}
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
                                    style={{ borderRadius: 0 }}
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
                                    style={{ borderRadius: 0 }}
                                />
                            </div>

                            {status === 'error' && (
                                <p className="text-xs text-[rgb(var(--accent-primary))]">
                                    Submission failed. Please email us at hello@oast.io or try again.
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'sending'}
                                className="w-full py-3 text-xs tracking-widest bg-[rgb(var(--accent-primary))] text-[rgb(var(--bg-canvas))] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
