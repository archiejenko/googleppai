import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: ('user' | 'team_lead' | 'admin')[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuth();

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If roles are specified, check if user has required role
    if (roles && roles.length > 0) {
        if (!user?.role || !roles.includes(user.role)) {
            // User doesn't have required role - redirect to dashboard
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
}
