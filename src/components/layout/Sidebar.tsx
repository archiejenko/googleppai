import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Mic,
    ChartBar,
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Zap,
    BarChart2,
    Target,
    BookOpen,
    Trophy,
    Calendar,
    Mail,
    Video,
    Bell,
    TrendingUp,
    PhoneCall,
    CreditCard,
    MonitorPlay,
    GitCompareArrows,
    Phone,
    MessageSquare,
    BarChart,
    UserCheck,
    Shield,
    Building2,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTier } from '../../context/TierContext';
import { useNotifications } from '../../hooks/useNotifications';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, onOpenPrep }: SidebarProps & { onOpenPrep?: () => void }) {
    const { user, signOut, isManager, isAdmin } = useAuth();
    const { isRevIntel } = useTier();
    const { data: notifications = [] } = useNotifications(user?.id);
    const unreadNotifications = notifications.filter(n => n.unread).length;

    const handleLogout = async () => {
        await signOut();
        window.location.href = '/';
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Mic, label: 'Practice', path: '/training' },
        { icon: Zap, label: 'Journey', path: '/learning-path' },
        { icon: ChartBar, label: 'Drills', path: '/drills' },
        { icon: BarChart2, label: 'Analytics', path: '/dashboard/training' },
        { icon: BookOpen, label: 'Library', path: '/library' },
        { icon: Users, label: 'Team', path: '/team' },
    ];

    const coachingItems: { icon: typeof Bell; label: string; path: string; badge?: number; tierLocked?: boolean }[] = [
        { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
        { icon: Target, label: 'Goals', path: '/goals' },
        { icon: Video, label: 'Recordings', path: '/recordings' },
        { icon: MonitorPlay, label: 'Meetings', path: '/meetings', tierLocked: !isRevIntel },
        { icon: Calendar, label: 'Schedule', path: '/schedule' },
        { icon: Mail, label: 'Inbox', path: '/inbox' },
        { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadNotifications },
        { icon: Settings, label: 'Settings', path: '/profile' },
    ];

    const salesNavItems: { icon: typeof Bell; label: string; path?: string; onClick?: () => void; tierLocked?: boolean }[] = [
        { icon: MessageSquare, label: 'Objections', path: '/objection-library' },
        { icon: BarChart, label: 'Win / Loss', path: '/win-loss' },
        { icon: Phone, label: 'Pre-Call Prep', onClick: onOpenPrep, tierLocked: !isRevIntel },
        ...(isManager ? [{ icon: UserCheck as typeof Bell, label: 'Coaching', path: '/manager' }] : []),
        ...(isAdmin ? [
            { icon: Building2 as typeof Bell, label: 'Accounts', path: '/admin/companies' },
            { icon: Shield as typeof Bell, label: 'Audit Log', path: '/admin/audit-log' },
        ] : []),
    ];

    const intelNavItems: { icon: typeof Bell; label: string; path: string; tierLocked?: boolean }[] = [
        { icon: TrendingUp, label: 'Revenue Intel', path: '/dashboard/revenue', tierLocked: !isRevIntel },
        { icon: PhoneCall, label: 'Live Scores', path: '/dashboard/calls', tierLocked: !isRevIntel },
        { icon: MessageSquare, label: 'Insights', path: '/dashboard/insights', tierLocked: !isRevIntel },
        { icon: GitCompareArrows, label: 'Transfer Gap', path: '/transfer-gap', tierLocked: !isRevIntel },
        { icon: CreditCard, label: 'Billing', path: '/settings/billing', tierLocked: false },
    ];

    const linkClass = (isActive: boolean, tierLocked?: boolean) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium relative transition-all duration-200 ${
            isActive
                ? 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B] font-semibold'
                : tierLocked
                    ? 'text-[rgb(var(--text-muted))] opacity-60 hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgb(var(--text-secondary))]'
                    : 'text-[rgb(var(--text-secondary))] hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgb(var(--text-primary))]'
        }`;

    const renderNavItem = (item: { icon: typeof Bell; label: string; path: string; badge?: number; tierLocked?: boolean }) => (
        <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => linkClass(isActive, item.tierLocked)}
        >
            {({ isActive }) => (
                <>
                    {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#FF6B6B] rounded-r" />
                    )}
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                    <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        {item.label}
                    </span>
                    {item.badge && item.badge > 0 && !collapsed ? (
                        <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-[#FF6B6B] text-white px-1 rounded">
                            {item.badge}
                        </span>
                    ) : null}
                    {item.badge && item.badge > 0 && collapsed ? (
                        <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold bg-[#FF6B6B] text-white px-0.5 rounded">
                            {item.badge > 9 ? '9+' : item.badge}
                        </span>
                    ) : null}
                    {item.tierLocked && !collapsed && !item.badge ? (
                        <span className="ml-auto text-[9px] uppercase tracking-widest text-[#FF6B6B]/60 border border-[#FF6B6B]/20 px-1 rounded">
                            Pro
                        </span>
                    ) : null}
                    {collapsed && (
                        <div className="absolute left-full ml-3 px-2 py-1 bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 flex items-center gap-2">
                            {item.label}
                            {item.badge && item.badge > 0 ? <span className="px-1 text-[10px] bg-[#FF6B6B] text-white rounded">{item.badge}</span> : null}
                        </div>
                    )}
                </>
            )}
        </NavLink>
    );

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-[rgb(var(--bg-surface))] border-r border-[rgb(var(--border-default))] transition-all duration-300 z-50 flex flex-col overflow-hidden
            ${collapsed ? 'w-[56px]' : 'w-[200px]'}`}
        >
            {/* Logo */}
            <div className="h-12 flex items-center px-4 border-b border-[rgb(var(--border-default))]">
                <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                    <span className={`font-display font-bold text-xl tracking-tight text-[rgb(var(--text-primary))] transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                        OAST<span className="text-[#FF6B6B]">.</span>
                        <span className="text-[9px] text-[rgb(var(--text-muted))] font-mono opacity-50 ml-1.5">v1.2</span>
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-3 px-2 space-y-px overflow-y-auto overflow-x-hidden scrollbar-hide">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `group ${linkClass(isActive)}`}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#FF6B6B] rounded-r" />
                                )}
                                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                                <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                    {item.label}
                                </span>
                                {collapsed && (
                                    <div className="absolute left-full ml-3 px-2 py-1 bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        {item.label}
                                    </div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}

                {/* Coaching divider */}
                <div className="py-2">
                    <div className="h-px bg-[rgb(var(--border-default))] opacity-40 mx-1" />
                </div>
                {!collapsed && (
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--text-muted))] opacity-50 font-display">
                        Coaching
                    </p>
                )}

                {coachingItems.map((item) => (
                    <div key={item.path} className="group relative">
                        {renderNavItem(item)}
                    </div>
                ))}

                {/* Sales section (no label, just divider) */}
                <div className="py-2">
                    <div className="h-px bg-[rgb(var(--border-default))] opacity-40 mx-1" />
                </div>

                {salesNavItems.map((item) => {
                    if (item.onClick) {
                        return (
                            <button
                                key={item.label}
                                onClick={item.onClick}
                                className={`group w-full ${linkClass(false, item.tierLocked)}`}
                            >
                                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                                <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                    {item.label}
                                </span>
                                {item.tierLocked && !collapsed && (
                                    <span className="ml-auto text-[9px] uppercase tracking-widest text-[#FF6B6B]/60 border border-[#FF6B6B]/20 px-1 rounded">Pro</span>
                                )}
                                {collapsed && (
                                    <div className="absolute left-full ml-3 px-2 py-1 bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        {item.label}{item.tierLocked ? ' (Revenue Intel)' : ''}
                                    </div>
                                )}
                            </button>
                        );
                    }

                    return (
                        <div key={item.path} className="group relative">
                            <NavLink
                                to={item.path!}
                                className={({ isActive }) => linkClass(isActive, item.tierLocked)}
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#FF6B6B] rounded-r" />
                                        )}
                                        <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                                        <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                            {item.label}
                                        </span>
                                        {item.tierLocked && !collapsed && (
                                            <span className="ml-auto text-[9px] uppercase tracking-widest text-[#FF6B6B]/60 border border-[#FF6B6B]/20 px-1 rounded">Pro</span>
                                        )}
                                        {collapsed && (
                                            <div className="absolute left-full ml-3 px-2 py-1 bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                {item.label}{item.tierLocked ? ' (Revenue Intel)' : ''}
                                            </div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        </div>
                    );
                })}

                {/* Intelligence section */}
                <div className="py-2">
                    <div className="h-px bg-[rgb(var(--border-default))] opacity-40 mx-1" />
                </div>
                {!collapsed && (
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--text-muted))] opacity-50 font-display">
                        Intelligence
                    </p>
                )}

                {intelNavItems.map((item) => (
                    <div key={item.path} className="group relative">
                        {renderNavItem(item)}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-[rgb(var(--border-default))]">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors mb-1"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[rgb(var(--text-muted))] hover:bg-[rgba(248,113,113,0.1)] hover:text-[#F87171] transition-all duration-200 text-xs
                        ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Sign Out
                    </span>
                </button>
            </div>
        </aside>
    );
}
