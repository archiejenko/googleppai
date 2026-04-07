import { useEffect } from 'react';
import MEDDICLive from './MEDDICLive';
import ObjectionTracker, { type TrackedObjection } from './ObjectionTracker';

interface IntelDrawerProps {
    open: boolean;
    onClose: () => void;
    meddic: Record<string, number>;
    objections: TrackedObjection[];
}

export default function IntelDrawer({ open, onClose, meddic, objections }: IntelDrawerProps) {
    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40"
                onClick={onClose}
                aria-hidden
            />
            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-[#2a2a2e] max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2e]">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted">
                        Live Intel
                    </p>
                    <button
                        onClick={onClose}
                        className="text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-text-primary px-2 py-1 border border-[#2a2a2e] hover:border-[#3a3a3e] transition-colors"
                    >
                        Close
                    </button>
                </div>
                <div className="p-5 grid grid-cols-2 gap-6">
                    <MEDDICLive progress={meddic} />
                    <ObjectionTracker objections={objections} />
                </div>
            </div>
        </>
    );
}
