import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Loader } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: ('user' | 'team_lead' | 'admin')[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { isAuthenticated, user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[rgb(var(--bg-canvas))] flex items-center justify-center">
                <Loader className="w-8 h-8 text-[rgb(var(--accent-primary))] animate-spin" />
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Email not verified check
    // Note: Supabase auth.users usually has this field. If using external providers it might be auto-confirmed.
    // For standard email/pass, it's null until clicked.
    if (user && !user.email_confirmed_at) {
        return (
            <div className="min-h-screen bg-[rgb(var(--bg-canvas))] flex items-center justify-center p-4">
                <div className="card-hero max-w-md w-full p-8 text-center">
                    <div className="bg-[rgb(var(--accent-primary)/0.1)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="h-8 w-8 text-[rgb(var(--accent-primary))]" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">Verify your email</h2>
                    <p className="text-[rgb(var(--text-secondary))] mb-6">
                        We've sent a verification link to <strong>{user.email}</strong>.<br />
                        Please check your inbox to continue.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-ghost w-full"
                    >
                        I've verified my email
                    </button>
                    <p className="text-xs text-[rgb(var(--text-muted))] mt-4">
                        If you don't see the email, check your spam folder.
                    </p>
                </div>
            </div>
        );
    }

    // If roles are specified, check if user has required role
    if (roles && roles.length > 0) {
        const userRole = user?.role || 'user'; // Default to user if undefined
        if (!roles.includes(userRole)) {
            // User doesn't have required role - redirect to dashboard (or a 403 page)
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
}
