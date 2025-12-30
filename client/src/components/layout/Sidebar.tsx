import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Mic,
    BarChart3,
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    GraduationCap
} from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Mic, label: 'Practice', path: '/training' },
        { icon: BarChart3, label: 'Analysis', path: '/pitch/latest' }, // Placeholder path
        { icon: GraduationCap, label: 'Drills', path: '/learning-path' },
        { icon: Users, label: 'Team', path: '/team' },
        { icon: Settings, label: 'Settings', path: '/profile' },
    ];

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-bg-surface border-r border-border backdrop-blur-xl transition-all duration-300 z-50 flex flex-col
            ${collapsed ? 'w-20' : 'w-64'}`}
        >
            {/* Header / Logo */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                    {/* OAST Logo Logic */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center font-display font-bold text-white">
                        O
                    </div>
                    <span className={`font-display font-bold text-xl tracking-tight transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                        OAST<span className="text-accent">.</span>
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative
                            ${isActive
                                ? 'bg-accent/10 text-accent font-medium'
                                : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
                            }
                        `}
                    >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />

                        <span className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            {item.label}
                        </span>

                        {/* Hover Tooltip for Collapsed State */}
                        {collapsed && (
                            <div className="absolute left-full ml-4 px-2 py-1 bg-bg-raised border border-border text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                {item.label}
                            </div>
                        )}

                        {/* Active Indicator Strip */}
                        {({ isActive }: { isActive: boolean }) => isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-accent rounded-r-full" />
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / User Controls */}
            <div className="p-3 border-t border-border/50">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-bg-raised text-text-muted hover:text-text-primary transition-colors mb-2"
                >
                    {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>

                <button
                    onClick={handleLogout}
                    className={`
                        w-full flex items-center px-3 py-3 rounded-lg text-text-muted hover:bg-status-danger/10 hover:text-status-danger transition-all duration-200
                        ${collapsed ? 'justify-center' : ''}
                    `}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <span className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Sign Out
                    </span>
                </button>
            </div>
        </aside>
    );
}
