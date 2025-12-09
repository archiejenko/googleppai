import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mic, LogOut, LayoutDashboard, Target, BookOpen, Building2, Users, DollarSign } from 'lucide-react';

export default function Layout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
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
                            <span className="ml-3 text-xl font-bold text-white">PitchPerfect AI</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/dashboard"
                                className="text-gray-300 hover:text-white flex items-center font-medium transition-colors"
                            >
                                <LayoutDashboard className="h-5 w-5 mr-1" />
                                Dashboard
                            </Link>
                            <Link
                                to="/training"
                                className="text-gray-300 hover:text-white flex items-center font-medium transition-colors"
                            >
                                <Target className="h-5 w-5 mr-1" />
                                Training
                            </Link>
                            <Link
                                to="/learning-path"
                                className="text-gray-300 hover:text-white flex items-center font-medium transition-colors"
                            >
                                <BookOpen className="h-5 w-5 mr-1" />
                                Learning
                            </Link>
                            <Link
                                to="/industries"
                                className="text-gray-300 hover:text-white flex items-center font-medium transition-colors"
                            >
                                <Building2 className="h-5 w-5 mr-1" />
                                Industries
                            </Link>
                            <Link
                                to="/team"
                                className="text-gray-300 hover:text-white flex items-center font-medium transition-colors"
                            >
                                <Users className="h-5 w-5 mr-1" />
                                Team
                            </Link>
                            <Link
                                to="/pricing"
                                className="text-gray-300 hover:text-white flex items-center font-medium transition-colors"
                            >
                                <DollarSign className="h-5 w-5 mr-1" />
                                Pricing
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="text-gray-300 hover:text-red-400 flex items-center font-medium transition-colors"
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
