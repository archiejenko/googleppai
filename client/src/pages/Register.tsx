import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function Register() {
    return (
        <div className="layout-shell flex flex-col justify-center py-12 sm:px-6 lg:px-8 h-screen relative overflow-hidden">
            {/* Animated Background Elements (Consistent with Login) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgb(var(--accent-primary)/0.1)] rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-status-warning/10 border border-status-warning/20 mb-6 animate-in-up">
                    <ShieldAlert className="h-8 w-8 text-status-warning" />
                </div>

                <h2 className="text-3xl font-display font-bold text-[rgb(var(--text-primary))] mb-4 animate-in-up" style={{ animationDelay: '0.1s' }}>
                    Invite Only
                </h2>

                <p className="text-[rgb(var(--text-secondary))] mb-8 animate-in-up" style={{ animationDelay: '0.2s' }}>
                    Registration is currently restricted to invited members only. Please contact your team administrator to request an account.
                </p>

                <div className="animate-in-up" style={{ animationDelay: '0.3s' }}>
                    <Link to="/login" className="btn-primary inline-flex items-center">
                        Return to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
