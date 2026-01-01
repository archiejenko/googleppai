import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mic, LogOut, LayoutDashboard, Target, BookOpen, Building2, Users, Shield, CircleUser } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
    const { signOut, isAdmin, isManager } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen gradient-dark-bg">
            <nav className="navbar-glass">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center cursor-pointer group" onClick={() => navigate('/dashboard')}>
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-2 rounded-xl">
                                    <Mic className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <span className="ml-3 text-xl font-bold text-theme-primary">PitchPerfect AI</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/dashboard"
                                className="text-theme-muted hover:text-theme-primary flex items-center font-medium transition-colors"
                            >
                                <LayoutDashboard className="h-5 w-5 mr-1" />
                                Dashboard
                            </Link>
                            <Link
                                to="/training"
                                className="text-theme-muted hover:text-theme-primary flex items-center font-medium transition-colors"
                            >
                                <Target className="h-5 w-5 mr-1" />
                                Training
                            </Link>
                            <Link
                                to="/learning-path"
                                className="text-theme-muted hover:text-theme-primary flex items-center font-medium transition-colors"
                            >
                                <BookOpen className="h-5 w-5 mr-1" />
                                Learning
                            </Link>
                            <Link
                                to="/industries"
                                className="text-theme-muted hover:text-theme-primary flex items-center font-medium transition-colors"
                            >
                                <Building2 className="h-5 w-5 mr-1" />
                                Industries
                            </Link>
                            {isManager && (
                                <Link
                                    to="/team"
                                    className="text-theme-muted hover:text-theme-primary flex items-center font-medium transition-colors"
                                >
                                    <Users className="h-5 w-5 mr-1" />
                                    Team
                                </Link>
                            )}
                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    className="text-theme-accent hover:opacity-80 flex items-center font-medium transition-colors"
                                >
                                    <Shield className="h-5 w-5 mr-1" />
                                    Admin
                                </Link>
                            )}

                            <Link
                                to="/profile"
                                className="text-theme-muted hover:text-theme-primary flex items-center font-medium transition-colors"
                            >
                                <CircleUser className="h-5 w-5 mr-1" />
                                Profile
                            </Link>
                            <ThemeToggle />
                            <button
                                onClick={handleLogout}
                                className="text-theme-muted hover:text-red-400 flex items-center font-medium transition-colors"
                            >
                                <LogOut className="h-5 w-5 mr-1" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main>
                <Outlet />
            </main>
        </div>
    );
}

