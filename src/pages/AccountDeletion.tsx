import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { AlertTriangle, Trash2, Loader, CheckCircle } from 'lucide-react';

export default function AccountDeletion() {
    const [confirmed, setConfirmed] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [reference, setReference] = useState('');
    const navigate = useNavigate();

    const handleDelete = async () => {
        if (!confirmed) return;
        setIsDeleting(true);
        setError('');

        try {
            const { data, error: fnError } = await supabase.functions.invoke('gdpr-erasure', {
                body: {},
            });

            if (fnError) throw fnError;

            setReference(data.reference);
            // Sign out happens automatically once auth.admin.deleteUser fires,
            // but we also sign out locally to clear session state.
            await supabase.auth.signOut();
            setTimeout(() => navigate('/'), 5000);
        } catch (err: unknown) {
            console.error('Account deletion failed', err);
            setError('Deletion failed. Please contact support if this persists.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (reference) {
        return (
            <div className="layout-shell flex items-center justify-center p-4 sm:p-8">
                <div className="max-w-lg w-full mx-auto text-center">
                    <div className="card-hero p-8">
                        <CheckCircle className="h-16 w-16 text-status-success mx-auto mb-4" />
                        <h1 className="text-2xl font-display font-bold text-[rgb(var(--text-primary))] mb-3">
                            Account Deleted
                        </h1>
                        <p className="text-[rgb(var(--text-secondary))] mb-4">
                            Your account and all associated data have been permanently deleted.
                        </p>
                        <p className="text-[rgb(var(--text-muted))] text-sm font-mono bg-[rgb(var(--surface-2))] px-3 py-2 rounded-[var(--radius-sm)]">
                            Reference: {reference}
                        </p>
                        <p className="text-[rgb(var(--text-muted))] text-sm mt-4">
                            Redirecting you to the homepage…
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="layout-shell flex items-center justify-center p-4 sm:p-8">
            <div className="max-w-lg w-full mx-auto">
                <div className="card-hero p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-status-danger/10 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="h-6 w-6 text-status-danger" />
                        </div>
                        <div>
                            <h1 className="text-xl font-display font-bold text-[rgb(var(--text-primary))]">
                                Delete Account
                            </h1>
                            <p className="text-[rgb(var(--text-muted))] text-sm">This action cannot be undone</p>
                        </div>
                    </div>

                    <p className="text-[rgb(var(--text-secondary))] mb-6 text-sm leading-relaxed">
                        Deleting your account will permanently remove all your data from OAST, including:
                        pitch recordings, training sessions, analytics, drills, and your profile.
                        This complies with your right to erasure under GDPR Article 17.
                    </p>

                    {error && (
                        <div className="mb-4 bg-status-danger/10 border border-status-danger/20 text-status-danger px-4 py-3 rounded-[var(--radius-md)] text-sm">
                            {error}
                        </div>
                    )}

                    <label className="flex items-start gap-3 cursor-pointer mb-6 group">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-status-danger flex-shrink-0"
                        />
                        <span className="text-[rgb(var(--text-secondary))] text-sm">
                            I understand this will permanently delete my account and all associated data.
                            This cannot be reversed.
                        </span>
                    </label>

                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="btn-secondary flex-1"
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={!confirmed || isDeleting}
                            className="flex-1 px-4 py-2 rounded-[var(--radius-md)] bg-status-danger text-white font-medium transition-all
                                disabled:opacity-40 disabled:cursor-not-allowed
                                hover:bg-red-600 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <><Loader className="h-4 w-4 animate-spin" /> Deleting…</>
                            ) : (
                                <><Trash2 className="h-4 w-4" /> Delete My Account</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
